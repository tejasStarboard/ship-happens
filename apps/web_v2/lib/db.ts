import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "sqlite.db");

fs.mkdirSync(dataDir, { recursive: true });

export const sqlite = new Database(dbPath);
export const SQLITE_PATH = dbPath;
