import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type SqliteDatabase = Database.Database;

export interface DatabaseOptions {
  filename?: string;
  readonly?: boolean;
  memory?: boolean;
}

export function defaultDatabasePath(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.LEARNING_WORKTABLE_DB ?? env.DATABASE_PATH;
  return resolve(configured ?? ".data/learning-worktable.db");
}

export function openDatabase(options: DatabaseOptions = {}): SqliteDatabase {
  const filename = options.memory ? ":memory:" : (options.filename ?? defaultDatabasePath());
  if (filename !== ":memory:" && !options.readonly) mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new Database(filename, { readonly: options.readonly ?? false });
  db.pragma("foreign_keys = ON");
  if (!options.readonly) db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  return db;
}

export function closeDatabase(db: SqliteDatabase): void {
  if (db.open) db.close();
}

export const createDatabase = openDatabase;
