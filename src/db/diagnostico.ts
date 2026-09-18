/**
 * Diagnóstico da ligação à base de dados.
 *
 *   npm run db:diagnostico
 *
 * Diz, para cada endereço configurado, se responde, que versão do
 * PostgreSQL atende, quantas migrações já foram aplicadas e que tabelas
 * existem. Nunca mostra palavras-passe.
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { criarPool, enderecoLegivel, urlDaBase, urlsDeMigracao } from "./index";

async function experimentar(url: string, papel: string) {
  const onde = enderecoLegivel(url);
  const pool = criarPool(url, 1);
  const base = drizzle(pool);
  try {
    const versao = await base.execute(sql`SELECT version() AS v`);
    console.log(`\n${papel} — ${onde}: responde`);
    console.log(`  ${String((versao.rows[0] as { v: string }).v).split(",")[0]}`);

    const tabelas = await base.execute(
      sql`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`
    );
    console.log(`  tabelas em public: ${(tabelas.rows[0] as { n: number }).n}`);

    try {
      const migracoes = await base.execute(sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`);
      console.log(`  migrações aplicadas: ${(migracoes.rows[0] as { n: number }).n}`);
    } catch {
      console.log("  migrações aplicadas: nenhuma (tabela de controlo ainda não existe)");
    }
  } catch (e) {
    console.log(`\n${papel} — ${onde}: NÃO responde`);
    console.log(`  ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
  } finally {
    await pool.end().catch(() => {});
  }
}

async function main() {
  const url = urlDaBase();
  if (!url || url.startsWith("pglite:")) {
    console.log("Sem base de dados configurada: o site usaria a base embutida de demonstração.");
    console.log("Defina DATABASE_URL (ou POSTGRES_URL) no .env para testar a ligação real.");
    return;
  }

  console.log("Endereços configurados (sem palavras-passe):");
  await experimentar(url, "site");
  for (const migracao of urlsDeMigracao()) {
    if (migracao !== url) await experimentar(migracao, "migrações");
  }

  console.log(
    [
      "",
      "Se nenhum responder na Vercel:",
      "  · use as ligações do pooler (aws-…pooler.supabase.com), não db.<ref>.supabase.co;",
      "  · porta 6543 para o site, 5432 para as migrações;",
      "  · a palavra-passe é a do projecto Supabase, com os caracteres especiais codificados.",
    ].join("\n")
  );
}

main().catch((e) => {
  console.error("Diagnóstico falhou:", e);
  process.exitCode = 1;
});
