/**
 * Ligação à base de dados.
 *
 *  · Com DATABASE_URL = "postgresql://…"  → PostgreSQL real (Fase 2, produção).
 *  · Sem DATABASE_URL, ou "pglite:<pasta>" → PostgreSQL embutido (PGlite),
 *    guardado em disco na pasta indicada. Serve a Fase 1: o site corre com
 *    dados simulados sem servidor de base de dados, usando exatamente as
 *    mesmas consultas, regras e migrações da produção.
 */

import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import * as schema from "./schema";

export type BaseDeDados = NodePgDatabase<typeof schema>;

type Ligacao = {
  db: BaseDeDados;
  embutida: boolean;
  fechar: () => Promise<void>;
};

const PASTA_EMBUTIDA_PADRAO = ".dados/pglite";

export function ehBaseEmbutida(url = process.env.DATABASE_URL): boolean {
  return !url || url.startsWith("pglite:");
}

function criarLigacao(): Ligacao {
  const url = process.env.DATABASE_URL;

  if (ehBaseEmbutida(url)) {
    const pasta = path.resolve(url?.slice("pglite:".length) || PASTA_EMBUTIDA_PADRAO);
    mkdirSync(path.dirname(pasta), { recursive: true });
    const cliente = new PGlite(pasta);
    // As APIs usadas (select, insert, transaction, execute) são as mesmas
    // nos dois controladores; o tipo comum evita ramificar o código todo.
    const db = drizzlePglite(cliente, { schema }) as unknown as BaseDeDados;
    return { db, embutida: true, fechar: () => cliente.close() };
  }

  const pool = new Pool({
    connectionString: url,
    // Serviços geridos (Neon, Supabase, Railway) exigem TLS.
    ssl: /localhost|127\.0\.0\.1/.test(url!) ? false : { rejectUnauthorized: false },
    max: 10,
  });
  return { db: drizzlePg(pool, { schema }), embutida: false, fechar: () => pool.end() };
}

// Uma única ligação por processo: o Next.js carrega este módulo em várias
// camadas (instrumentação, rotas, acções) e todas têm de partilhar a mesma.
const global = globalThis as unknown as { __ddressLigacao?: Ligacao };
const ligacao = global.__ddressLigacao ?? criarLigacao();
global.__ddressLigacao = ligacao;

export const db = ligacao.db;
export const baseEmbutida = ligacao.embutida;
export const fecharBaseDeDados = ligacao.fechar;
export { schema };
