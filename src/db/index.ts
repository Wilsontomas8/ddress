/**
 * Ligação à base de dados.
 *
 *  · Com DATABASE_URL = "postgresql://…"  → PostgreSQL real (Fase 2, produção).
 *  · Sem DATABASE_URL, ou "pglite:<pasta>" → PostgreSQL embutido (PGlite),
 *    guardado em disco na pasta indicada. Serve a Fase 1: o site corre com
 *    dados simulados sem servidor de base de dados, usando exatamente as
 *    mesmas consultas, regras e migrações da produção.
 */

import { existsSync, mkdirSync, renameSync } from "node:fs";
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
  pasta: string | null;
  fechar: () => Promise<void>;
};

// Na Vercel o disco é só de leitura, excepto /tmp: a base de demonstração
// vive lá e é recriada a cada arranque a frio.
const PASTA_EMBUTIDA_PADRAO = process.env.VERCEL ? "/tmp/ddress-pglite" : ".dados/pglite";

/**
 * Endereço da base de dados. Aceita DATABASE_URL e, na Vercel com a
 * integração do Supabase, POSTGRES_URL (ligação pelo pooler).
 */
export function urlDaBase(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

/** Para migrações convém a ligação directa, sem pooler, quando existe. */
export function urlDeMigracao(): string | undefined {
  return urlsDeMigracao()[0];
}

/** Esconde a palavra-passe: serve para dizer nos registos onde se ligou. */
export function enderecoLegivel(url: string): string {
  try {
    const e = new URL(url);
    return `${e.hostname}:${e.port || "5432"}`;
  } catch {
    return "endereço inválido";
  }
}

/**
 * Endereços a tentar para migrar, por ordem de preferência.
 *
 * A ligação directa do Supabase (db.<ref>.supabase.co) só responde por
 * IPv6 e a Vercel não fala IPv6: por isso, quando só temos o pooler em
 * modo transacção (porta 6543), tentamos também o mesmo pooler em modo
 * sessão (porta 5432), que é o que as migrações precisam.
 */
export function urlsDeMigracao(): string[] {
  const candidatas = [
    process.env.DATABASE_URL_DIRECT,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
  ].filter((u): u is string => !!u && !u.startsWith("pglite:"));

  const lista: string[] = [];
  const juntar = (url: string) => {
    if (!lista.includes(url)) lista.push(url);
  };

  for (const url of candidatas) {
    juntar(url);
    try {
      const e = new URL(url);
      if (e.hostname.includes("pooler.supabase.com") && e.port === "6543") {
        e.port = "5432";
        juntar(e.toString());
      }
    } catch {
      // endereço estranho: fica como está e falha com mensagem clara
    }
  }
  return lista;
}

export function ehBaseEmbutida(url = urlDaBase()): boolean {
  return !url || url.startsWith("pglite:");
}

/**
 * Pool para PostgreSQL gerido. O parâmetro sslmode da URL sobrepõe-se às
 * opções do node-postgres e obriga a validar o certificado do pooler do
 * Supabase, que não é de uma autoridade pública: tira-se da URL e liga-se
 * TLS explicitamente.
 */
export function criarPool(url: string, max = 10): Pool {
  const local = /localhost|127\.0\.0\.1/.test(url);
  const endereco = new URL(url);
  endereco.searchParams.delete("sslmode");
  endereco.searchParams.delete("supa");
  endereco.searchParams.delete("pgbouncer");
  return new Pool({
    connectionString: endereco.toString(),
    ssl: local ? false : { rejectUnauthorized: false },
    max,
    // Falhar depressa e com mensagem, em vez de o build ficar pendurado
    connectionTimeoutMillis: 20_000,
  });
}

function criarLigacao(): Ligacao {
  const url = urlDaBase();

  if (ehBaseEmbutida(url)) {
    const pasta = path.resolve(url?.slice("pglite:".length) || PASTA_EMBUTIDA_PADRAO);
    mkdirSync(path.dirname(pasta), { recursive: true });
    const cliente = new PGlite(pasta);
    // As APIs usadas (select, insert, transaction, execute) são as mesmas
    // nos dois controladores; o tipo comum evita ramificar o código todo.
    const db = drizzlePglite(cliente, { schema }) as unknown as BaseDeDados;
    return { db, embutida: true, pasta, fechar: () => cliente.close() };
  }

  // Em funções serverless cada instância abre poucas ligações.
  const pool = criarPool(url!, process.env.VERCEL ? 3 : 10);
  return { db: drizzlePg(pool, { schema }), embutida: false, pasta: null, fechar: () => pool.end() };
}

// Uma única ligação por processo: o Next.js carrega este módulo em várias
// camadas (instrumentação, rotas, acções) e todas têm de partilhar a mesma.
const global = globalThis as unknown as { __ddressLigacao?: Ligacao };
global.__ddressLigacao ??= criarLigacao();

const actual = () => global.__ddressLigacao!;

/**
 * `db` aponta sempre para a ligação actual, para que a base embutida possa
 * ser recriada (ver recriarBaseEmbutida) sem reiniciar o servidor.
 */
export const db = new Proxy({} as BaseDeDados, {
  get(_alvo, chave) {
    const alvo = actual().db as unknown as Record<PropertyKey, unknown>;
    const valor = Reflect.get(alvo, chave, alvo);
    return typeof valor === "function" ? (valor as (...a: unknown[]) => unknown).bind(alvo) : valor;
  },
});

export const baseEmbutida = actual().embutida;
export const fecharBaseDeDados = () => actual().fechar();

/**
 * Só para a base embutida de demonstração: põe a pasta actual de parte
 * (ex.: ficou danificada por o servidor ter sido parado à força) e abre
 * uma base nova, vazia. Devolve onde ficou a cópia antiga.
 */
export async function recriarBaseEmbutida(): Promise<string | null> {
  const ligacao = actual();
  if (!ligacao.embutida || !ligacao.pasta) return null;
  await ligacao.fechar().catch(() => {});
  let copia: string | null = null;
  if (existsSync(ligacao.pasta)) {
    copia = `${ligacao.pasta}-danificada-${Date.now()}`;
    renameSync(ligacao.pasta, copia);
  }
  global.__ddressLigacao = criarLigacao();
  return copia;
}

export { schema };
