import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

async function runMigrations() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5434/hinglish_orders";

  console.log("Connecting to PostgreSQL at:", connectionString.replace(/:[^:@]*@/, ":***@"));

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    console.log("Running pending migrations from ./drizzle...");
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    console.log("Migrations applied successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
