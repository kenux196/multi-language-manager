import { Router, Request, Response } from 'express';
import db from '../database';
import multer from 'multer';
import fs from 'fs';
import { Database, RunResult } from 'sqlite3';

const router = Router();

interface Language {
  id: number;
  code: string;
  name: string;
}

interface TranslationRow {
  id: number;
  key: string;
  [key: string]: any; // For dynamic language columns
}

interface TranslationImportItem {
  key: string;
  [key: string]: string; // For dynamic language texts
}

const upload = multer({ dest: 'uploads/' });

// F-2: 다국어 목록 조회 및 검색
router.get('/', (req: Request, res: Response) => {
  const { search } = req.query;

  // Subquery to get all languages dynamically
  db.all(
    'SELECT code FROM Languages ORDER BY id',
    (err: Error | null, languages: Language[]) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      const langCases = languages
        .map(
          (lang) =>
            `MAX(CASE WHEN l.code = '${lang.code}' THEN tc.text ELSE NULL END) as "${lang.code}"`
        )
        .join(', ');

      let query = `
      SELECT
        t.id,
        t.key,
        ${langCases}
      FROM Translations t
      LEFT JOIN TextContents tc ON t.id = tc.translation_id
      LEFT JOIN Languages l ON tc.language_id = l.id
    `;

      const params: any[] = [];
      if (search) {
        // This part is a bit tricky with dynamic languages and needs a more complex query or multiple queries.
        // For now, we search in the key.
        query += ` WHERE t.key LIKE ? `;
        params.push(`%${search}%`);
      }

      query += `
      GROUP BY t.id
      ORDER BY t.key
    `;

      db.all(query, params, (err: Error | null, rows: TranslationRow[]) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({
          data: rows,
          languages: languages.map((l: Language) => l.code),
        });
      });
    }
  );
});

router.post('/', (req: Request, res: Response) => {
  const { key, ...texts } = req.body;

  if (!key) {
    return res.status(400).json({ error: 'Key is required' });
  }

  db.serialize(() => {
    db.run(
      'INSERT INTO Translations (key) VALUES (?)',
      [key],
      function (this: RunResult, err: Error | null) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        const translationId = this.lastID;
        db.all(
          'SELECT * FROM Languages',
          (err: Error | null, languages: Language[]) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            const textContentStmt = db.prepare(
              'INSERT INTO TextContents (translation_id, language_id, text) VALUES (?, ?, ?)'
            );
            const historyStmt = db.prepare(
              'INSERT INTO History (translation_id, language_id, new_text, changed_by) VALUES (?, ?, ?, ?)'
            );

            for (const lang of languages) {
              const text = texts[lang.code] || '';
              textContentStmt.run(translationId, lang.id, text);
              historyStmt.run(translationId, lang.id, text, 'system'); // or get user from auth
            }

            textContentStmt.finalize();
            historyStmt.finalize();
            res.status(201).json({ id: translationId, key, ...texts });
          }
        );
      }
    );
  });
});

// F-4: 다국어 수정
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { ...texts } = req.body;

  db.serialize(() => {
    db.run(
      'UPDATE Translations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    db.all(
      'SELECT * FROM Languages',
      (err: Error | null, languages: Language[]) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const upsertStmt = db.prepare(`
        INSERT INTO TextContents (translation_id, language_id, text)
        VALUES (?, ?, ?)
        ON CONFLICT(translation_id, language_id) DO UPDATE SET text = excluded.text;
      `);

        const historyStmt = db.prepare(
          'INSERT INTO History (translation_id, language_id, old_text, new_text, changed_by) VALUES (?, ?, (SELECT text FROM TextContents WHERE translation_id = ? AND language_id = ?), ?, ?)'
        );

        for (const lang of languages) {
          if (texts[lang.code] !== undefined) {
            const newText = texts[lang.code];
            historyStmt.run(id, lang.id, id, lang.id, newText, 'system');
            upsertStmt.run(id, lang.id, newText);
          }
        }

        upsertStmt.finalize();
        historyStmt.finalize();
        res.status(200).json({ id, ...texts });
      }
    );
  });
});

// F-5: 데이터 Export
router.get('/export', (req: Request, res: Response) => {
  const query = `
    SELECT
      l.code,
      t.key,
      tc.text
    FROM Translations t
    JOIN TextContents tc ON t.id = tc.translation_id
    JOIN Languages l ON tc.language_id = l.id
    ORDER BY l.code, t.key;
  `;

  db.all(
    query,
    [],
    (
      err: Error | null,
      rows: { code: string; key: string; text: string }[]
    ) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const translationsByLang: { [key: string]: { [key: string]: string } } =
        {};

      for (const row of rows) {
        if (!translationsByLang[row.code]) {
          translationsByLang[row.code] = {};
        }
        translationsByLang[row.code][row.key] = row.text;
      }

      res.json(translationsByLang);
    }
  );
});

// F-1: 초기 데이터 일괄 등록 (Bulk Import)
router.post('/import', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const importData: TranslationImportItem[] = JSON.parse(fileContent);

    if (!Array.isArray(importData)) {
      return res
        .status(400)
        .json({
          error:
            'Invalid JSON format. Expected an array of translation objects.',
        });
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION;');

      const insertTranslationStmt = db.prepare(
        'INSERT OR IGNORE INTO Translations (key) VALUES (?)'
      );
      const getTranslationIdStmt = db.prepare(
        'SELECT id FROM Translations WHERE key = ?'
      );
      const upsertTextContentStmt = db.prepare(`
        INSERT INTO TextContents (translation_id, language_id, text)
        VALUES (?, ?, ?)
        ON CONFLICT(translation_id, language_id) DO UPDATE SET text = excluded.text;
      `);
      const getLanguageIdStmt = db.prepare(
        'SELECT id FROM Languages WHERE code = ?'
      );

      db.all(
        'SELECT * FROM Languages',
        (err: Error | null, languages: Language[]) => {
          if (err) {
            db.run('ROLLBACK;');
            return res.status(500).json({ error: err.message });
          }
          const langMap = new Map(
            languages.map((lang) => [lang.code, lang.id])
          );

          for (const item of importData) {
            if (!item.key) continue;

            insertTranslationStmt.run(item.key);
            getTranslationIdStmt.get(
              item.key,
              (err: Error | null, row: { id: number } | undefined) => {
                if (err || !row) return;
                const translationId = row.id;

                for (const langCode in item) {
                  if (langCode === 'key') continue;
                  const languageId = langMap.get(langCode);
                  if (languageId) {
                    const text = item[langCode] || '';
                    upsertTextContentStmt.run(translationId, languageId, text);
                  }
                }
              }
            );
          }

          insertTranslationStmt.finalize();
          getTranslationIdStmt.finalize();
          upsertTextContentStmt.finalize();
          getLanguageIdStmt.finalize();

          db.run('COMMIT;', (commitErr: Error | null) => {
            if (commitErr) {
              console.error('Commit error:', commitErr.message);
              return res.status(500).json({ error: commitErr.message });
            }
            res.status(200).json({ message: 'Bulk import successful.' });
          });
        }
      );
    });
  } catch (error: any) {
    console.error('File processing error:', error);
    res.status(500).json({ error: 'Failed to process file.' });
  } finally {
    if (req.file) {
      fs.unlink(req.file.path, (err: NodeJS.ErrnoException | null) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }
  }
});

export default router;
