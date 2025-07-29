import { Router, Request, Response } from 'express';
import db from '../database';
import multer from 'multer';
import fs from 'fs';
import { Database, RunResult } from 'sqlite3';

// Promisify sqlite3 methods
const dbRun = (db: Database, sql: string, params: any[] = []): Promise<RunResult> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: RunResult, err: Error | null) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (db: Database, sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: any) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (db: Database, sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

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
router.get('/', async (req: Request, res: Response) => {
  const { search } = req.query;

  try {
    const languages: Language[] = await dbAll(db, 'SELECT code FROM Languages ORDER BY id');

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
      query += ` WHERE t.key LIKE ? `;
      params.push(`%${search}%`);
    }

    query += `
      GROUP BY t.id
      ORDER BY t.key
    `;

    const rows: TranslationRow[] = await dbAll(db, query, params);

    res.json({
      data: rows,
      languages: languages.map((l: Language) => l.code),
    });
  } catch (error: any) {
    console.error('Error fetching translations:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { key, ...texts } = req.body;

  if (!key) {
    return res.status(400).json({ error: 'Key is required' });
  }

  try {
    const result = await dbRun(db, 'INSERT INTO Translations (key) VALUES (?)', [key]);
    const translationId = result.lastID;

    const languages: Language[] = await dbAll(db, 'SELECT * FROM Languages');
    
    for (const lang of languages) {
      const text = texts[lang.code] || '';
      await dbRun(db, 'INSERT INTO TextContents (translation_id, language_id, text) VALUES (?, ?, ?)', [translationId, lang.id, text]);
      await dbRun(db, 'INSERT INTO History (translation_id, language_id, new_text, changed_by) VALUES (?, ?, ?, ?)', [translationId, lang.id, text, 'system']); // or get user from auth
    }

    res.status(201).json({ id: translationId, key, ...texts });
  } catch (error: any) {
    console.error('Error adding translation:', error);
    res.status(500).json({ error: error.message });
  }
});

// F-4: 다국어 수정
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ...texts } = req.body;

  try {
    await dbRun(db, 'UPDATE Translations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

    const languages: Language[] = await dbAll(db, 'SELECT * FROM Languages');
    
    for (const lang of languages) {
      if (texts[lang.code] !== undefined) {
        const newText = texts[lang.code];

        // Get old text for history
        const oldTextRow = await dbGet(db, 'SELECT text FROM TextContents WHERE translation_id = ? AND language_id = ?', [parseInt(id), lang.id]);
        const oldText = oldTextRow ? oldTextRow.text : null;

        await dbRun(db, `
          INSERT INTO TextContents (translation_id, language_id, text)
          VALUES (?, ?, ?)
          ON CONFLICT(translation_id, language_id) DO UPDATE SET text = excluded.text;
        `, [parseInt(id), lang.id, newText]);

        // Record history
        await dbRun(db, 'INSERT INTO History (translation_id, language_id, old_text, new_text, changed_by) VALUES (?, ?, ?, ?, ?)', [
          parseInt(id),
          lang.id,
          oldText,
          newText,
          'system', // or get user from auth
        ]);
      }
    }

    res.status(200).json({ id, ...texts });
  } catch (error: any) {
    console.error('Error updating translation:', error);
    res.status(500).json({ error: error.message });
  }
});

// F-5: 데이터 Export
router.get('/export', async (req: Request, res: Response) => {
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

  try {
    const rows: { code: string; key: string; text: string }[] = await dbAll(db, query, []);

    const translationsByLang: { [key: string]: { [key: string]: string } } =
      {};

    for (const row of rows) {
      if (!translationsByLang[row.code]) {
        translationsByLang[row.code] = {};
      }
      translationsByLang[row.code][row.key] = row.text;
    }

    res.json(translationsByLang);
  } catch (error: any) {
    console.error('Error exporting translations:', error);
    res.status(500).json({ error: error.message });
  }
});

// F-1: 초기 데이터 일괄 등록 (Bulk Import)
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
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

    await dbRun(db, 'BEGIN TRANSACTION;');

    try {
      const languages: Language[] = await dbAll(db, 'SELECT * FROM Languages');
      const langMap = new Map(
        languages.map((lang) => [lang.code, lang.id])
      );

      for (const item of importData) {
        if (!item.key) continue;

        await dbRun(db, 'INSERT OR IGNORE INTO Translations (key) VALUES (?)', [item.key]);
        const translationRow = await dbGet(db, 'SELECT id FROM Translations WHERE key = ?', [item.key]);
        const translationId = translationRow.id;

        for (const langCode in item) {
          if (langCode === 'key') continue;
          const languageId = langMap.get(langCode);
          if (languageId) {
            const newText = item[langCode] || '';

            // Get old text for history
            const oldTextRow = await dbGet(db, 'SELECT text FROM TextContents WHERE translation_id = ? AND language_id = ?', [translationId, languageId]);
            const oldText = oldTextRow ? oldTextRow.text : null;

            await dbRun(db, `
              INSERT INTO TextContents (translation_id, language_id, text)
              VALUES (?, ?, ?)
              ON CONFLICT(translation_id, language_id) DO UPDATE SET text = excluded.text;
            `, [translationId, languageId, newText]);

            // Record history
            await dbRun(db, 'INSERT INTO History (translation_id, language_id, old_text, new_text, changed_by) VALUES (?, ?, ?, ?, ?)', [
              translationId,
              languageId,
              oldText,
              newText,
              'bulk_import', // or get user from auth
            ]);
          }
        }
      }

      await dbRun(db, 'COMMIT;');
      res.status(200).json({ message: 'Bulk import successful.' });
    } catch (dbError: any) {
      await dbRun(db, 'ROLLBACK;');
      console.error('Database error during import:', dbError);
      res.status(500).json({ error: dbError.message });
    }
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
