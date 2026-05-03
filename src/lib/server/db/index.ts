import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "$env/dynamic/private";
import * as schema from "./schema.js";

let _db: MySql2Database<typeof schema> | null = null;

export function getDb() {
  if (!_db) {
    const url = env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const pool = mysql.createPool({ uri: url });
    _db = drizzle(pool, { schema, mode: "default" });
  }
  return _db;
}

export const db = new Proxy({} as MySql2Database<typeof schema>, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
