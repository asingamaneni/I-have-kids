import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = resolve(process.env.KINDERGARTEN_PROJECT_ROOT ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const requireFromDatabase = createRequire(resolve(root, "packages/database/src/db.ts"));
const Database = requireFromDatabase("better-sqlite3");
export default Database;
