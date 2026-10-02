import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5434/hinglish_orders";

const pool = new Pool({
  connectionString,
  max: 10,
});

export const db = drizzle(pool, { schema });
export { pool };
