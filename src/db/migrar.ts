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
import { drizzle } from "drizzle-orm/node-postgres";
import { baseEmbutida, criarPool, db, fecharBaseDeDados, urlDeMigracao } from "./index";

async function main() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  if (baseEmbutida) {
    await migrarPglite(db as unknown as PgliteDatabase, { migrationsFolder });
  } else {
    const pool = criarPool(urlDeMigracao()!, 1);
    try {
      await migrarPg(drizzle(pool), { migrationsFolder });
    } finally {
      await pool.end();
    }
  }
  console.log(`Migrações aplicadas (${baseEmbutida ? "base embutida" : "PostgreSQL"}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => fecharBaseDeDados());
