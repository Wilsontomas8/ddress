/**
 * Aplica as migrações pendentes (pasta drizzle/), na base embutida ou no
 * PostgreSQL indicado em DATABASE_URL.
 *
 *   npm run db:migrate
 */

import "dotenv/config";
import path from "node:path";
import { migrate as migrarPg } from "drizzle-orm/node-postgres/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migrarPglite } from "drizzle-orm/pglite/migrator";
import { baseEmbutida, db, fecharBaseDeDados } from "./index";

async function main() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  if (baseEmbutida) {
    await migrarPglite(db as unknown as PgliteDatabase, { migrationsFolder });
  } else {
    await migrarPg(db, { migrationsFolder });
  }
  console.log(`Migrações aplicadas (${baseEmbutida ? "base embutida" : "PostgreSQL"}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => fecharBaseDeDados());
