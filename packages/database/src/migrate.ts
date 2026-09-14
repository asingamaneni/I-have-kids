import { isAbsolute, resolve } from "node:path";
import { closeDatabase, openDatabase } from "./db.js";
import { migrateDatabase } from "./migrations.js";

// Same precedence as the web app and MCP service: the learning data location has
// no default, so a missing variable fails loudly instead of migrating a stray file.
const configured = (process.env.CHILD_LEARNING_DB_PATH ?? process.env.LEARNING_WORKTABLE_DB)?.trim();
if (!configured) {
  process.stderr.write("CHILD_LEARNING_DB_PATH is not set. The learning data location has no default: set CHILD_LEARNING_DB_PATH (and CHILD_LEARNING_ARTIFACTS_DIR) so every process reads and writes the same store.\n");
  process.exit(1);
}
const root = process.env.CHILD_LEARNING_PROJECT_ROOT ?? process.env.KINDERGARTEN_PROJECT_ROOT ?? process.cwd();
const databasePath = isAbsolute(configured) ? resolve(configured) : resolve(root, configured);

const db = openDatabase({ filename: databasePath });
try {
  migrateDatabase(db);
  process.stdout.write(`Migrated ${databasePath}\n`);
} finally {
  closeDatabase(db);
}
