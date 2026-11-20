import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_FILE = path.join(process.cwd(), 'data', 'crm.db');

/**
 * Opens the SQLite database and makes sure the schema exists.
 * Pass ':memory:' for tests.
 */
export function openDatabase(file = process.env.DATABASE_FILE || DEFAULT_FILE) {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL,
      phone       TEXT,
      company     TEXT,
      source      TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'New'
                  CHECK (status IN ('New', 'Contacted', 'Qualified', 'Converted')),
      notes       TEXT,
      value       INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_updated ON leads(updated_at DESC);
  `);
}
