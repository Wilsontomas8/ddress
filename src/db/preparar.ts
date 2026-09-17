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
import { baseEmbutida, db, recriarBaseEmbutida } from "./index";
import { semear } from "./semente";

const global = globalThis as unknown as { __ddressPreparacao?: Promise<void> };

async function migrarESemear() {
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

async function preparar(): Promise<void> {
  if (!baseEmbutida) return;

  try {
    await migrarESemear();
  } catch (erro) {
    // A base embutida só guarda dados de demonstração. Se não abrir
    // (tipicamente depois de o servidor ser terminado à força), fica
    // guardada à parte e começa-se uma nova.
    const copia = await recriarBaseEmbutida();
    console.warn(
      `[DDRESS] A base embutida não abriu (${erro instanceof Error ? erro.message.split("\n")[0] : erro}). ` +
        `Foi criada uma nova${copia ? `; a anterior ficou em ${copia}` : ""}.`
    );
    await migrarESemear();
  }
}

/** Idempotente e partilhado por todo o processo */
export function prepararBaseDeDados(): Promise<void> {
  global.__ddressPreparacao ??= preparar();
  return global.__ddressPreparacao;
}
