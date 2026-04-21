import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'medama.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS app_kv (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`);

export const KEYS = {
  buildings: 'medama_itrak_buildings',
  userProfiles: 'medama_itrak_user_profiles',
  lidarScans: 'medama_itrak_lidar_scans',
} as const;

const PASSCODE_KEY = 'medama_itrak_passcode';

export function getJson<T>(key: string, fallback: T): T {
  const row = db.prepare('SELECT value FROM app_kv WHERE key = ?').get(key) as { value: string } | undefined;
  if (!row?.value) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setJson(key: string, value: unknown): void {
  const text = JSON.stringify(value);
  db.prepare(
    `INSERT INTO app_kv (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, text);
}

export function getPasscode(): string {
  const row = db.prepare('SELECT value FROM app_kv WHERE key = ?').get(PASSCODE_KEY) as
    | { value: string }
    | undefined;
  if (!row?.value) return '1234';
  try {
    const v = JSON.parse(row.value);
    return typeof v === 'string' && v.length > 0 ? v : '1234';
  } catch {
    return '1234';
  }
}

export function setPasscode(passcode: string): void {
  setJson(PASSCODE_KEY, passcode);
}
