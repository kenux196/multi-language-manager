import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    createTables();
  }
});

const createTables = () => {
  const createLanguagesTable = `
    CREATE TABLE IF NOT EXISTS Languages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL
    );
  `;

  const createTranslationsTable = `
    CREATE TABLE IF NOT EXISTS Translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createTextContentsTable = `
    CREATE TABLE IF NOT EXISTS TextContents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      translation_id INTEGER NOT NULL,
      language_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY (translation_id) REFERENCES Translations(id) ON DELETE CASCADE,
      FOREIGN KEY (language_id) REFERENCES Languages(id),
      UNIQUE (translation_id, language_id)
    );
  `;

  const createHistoryTable = `
    CREATE TABLE IF NOT EXISTS History (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      translation_id INTEGER NOT NULL,
      language_id INTEGER NOT NULL,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      changed_by TEXT,
      old_text TEXT,
      new_text TEXT,
      FOREIGN KEY (translation_id) REFERENCES Translations(id) ON DELETE CASCADE,
      FOREIGN KEY (language_id) REFERENCES Languages(id)
    );
  `;

  db.serialize(() => {
    db.exec(createLanguagesTable, (err) => {
      if (err) console.error('Error creating Languages table', err.message);
      else {
        // Insert initial languages
        const insertLanguages = `INSERT OR IGNORE INTO Languages (code, name) VALUES ('ko', '한국어'), ('en-US', '미국식 영어'), ('en-GB', '영국식 영어');`;
        db.exec(insertLanguages);
      }
    });
    db.exec(createTranslationsTable, (err) => {
      if (err) console.error('Error creating Translations table', err.message);
    });
    db.exec(createTextContentsTable, (err) => {
      if (err) console.error('Error creating TextContents table', err.message);
    });
    db.exec(createHistoryTable, (err) => {
      if (err) console.error('Error creating History table', err.message);
    });
  });
};

export default db;
