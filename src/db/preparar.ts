/**
 * Prepara a base de dados embutida (Fase 1): aplica as migrações e, se a
 * base estiver vazia, carrega os dados de demonstração.
 *
 * Numa base PostgreSQL real não faz nada — aí as migrações correm de forma
 * controlada com `npm run db:migrate` (ver README).
 */

import path from "node:path";
import { sql } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { baseEmbutida, db } from "./index";
import { semear } from "./semente";

const global = globalThis as unknown as { __ddressPreparacao?: Promise<void> };

async function preparar(): Promise<void> {
  if (!baseEmbutida) return;

  await migrate(db as unknown as PgliteDatabase, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });

  const { rows } = await db.execute(sql`SELECT COUNT(*)::int AS n FROM settings`);
  const vazia = (rows[0] as { n: number } | undefined)?.n === 0;
  if (vazia) {
    await semear(db, () => {});
    console.log("[DDRESS] Base embutida criada com dados de demonstração.");
  }
}

/** Idempotente e partilhado por todo o processo */
export function prepararBaseDeDados(): Promise<void> {
  global.__ddressPreparacao ??= preparar();
  return global.__ddressPreparacao;
}
