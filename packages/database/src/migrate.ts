import { closeDatabase, openDatabase } from "./db.js";
import { migrateDatabase } from "./migrations.js";

const db = openDatabase();
try {
  migrateDatabase(db);
  process.stdout.write(`Migrated ${process.env.LEARNING_WORKTABLE_DB ?? ".data/learning-worktable.db"}\n`);
} finally {
  closeDatabase(db);
}
