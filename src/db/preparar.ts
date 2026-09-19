/**
 * Prepara a base de dados no arranque.
 *
 *  · Base embutida: aplica as migrações e, se estiver vazia, carrega a
 *    demonstração.
 *  · Base real: confirma que responde e tem as tabelas; se não, a loja
 *    passa para a base embutida e /api/saude diz porquê.
 */

import path from "node:path";
import { sql } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import {
  criarPool,
  db,
  enderecoLegivel,
  ligacaoEmbutida,
  recorrerABaseEmbutida,
  recriarBaseEmbutida,
  urlsDeMigracao,
} from "./index";
import { semear } from "./semente";

/** A mensagem que interessa: o drizzle embrulha o erro do PostgreSQL em "cause". */
function causa(erro: unknown): string {
  const e = erro as { message?: string; cause?: { message?: string } };
  return String(e?.cause?.message ?? e?.message ?? erro).split("\n")[0];
}

/** Só leitura: diz, para cada endereço de migração, se responde. */
async function sondarEnderecosDeMigracao(): Promise<string> {
  const linhas: string[] = [];
  for (const url of urlsDeMigracao()) {
    const pool = criarPool(url, 1);
    try {
      await pool.query("SELECT 1");
      linhas.push(`${enderecoLegivel(url)} responde`);
    } catch (e) {
      linhas.push(`${enderecoLegivel(url)} falha: ${e instanceof Error ? e.message.split("\n")[0] : e}`);
    } finally {
      await pool.end().catch(() => {});
    }
  }
  return linhas.join("; ");
}

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

/**
 * Com base real, confirma no arranque que ela responde e tem as tabelas.
 * Se não responder — endereço errado, rede fechada, migrações por aplicar —
 * a loja passa para a base de demonstração em vez de dar erro em todas as
 * páginas, e /api/saude diz o que se passa.
 */
async function confirmarBaseReal(): Promise<void> {
  try {
    await db.execute(sql`SELECT 1`);
  } catch (erro) {
    await recorrerABaseEmbutida(
      `não responde (${causa(erro)}). ` +
        `Endereços de migração: ${await sondarEnderecosDeMigracao()}`
    );
    return;
  }

  try {
    await db.execute(sql`SELECT 1 FROM settings LIMIT 1`);
  } catch {
    await recorrerABaseEmbutida(
      "responde, mas as tabelas ainda não existem (as migrações não foram aplicadas). " +
        `Endereços de migração: ${await sondarEnderecosDeMigracao()}`
    );
  }
}

async function preparar(): Promise<void> {
  if (!ligacaoEmbutida()) {
    await confirmarBaseReal();
    if (!ligacaoEmbutida()) return;
  }

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
