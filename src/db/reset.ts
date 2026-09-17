/**
 * Apaga por completo o esquema da base de dados.
 * Usado por `npm run db:reset`. CUIDADO: perde todos os dados.
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, fecharBaseDeDados } from "./index";

async function main() {
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  console.log("Esquema apagado e recriado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => fecharBaseDeDados());
