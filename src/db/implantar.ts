/**
 * Corre na Vercel antes de `next build` (script vercel-build).
 *
 *  · Base embutida (sem DATABASE_URL/POSTGRES_URL): nada a fazer.
 *  · PostgreSQL real (Supabase):
 *      1. aplica as migrações pendentes;
 *      2. se a base estiver vazia, carrega a demonstração em modo público
 *         — catálogo e pedidos fictícios, contas de demonstração sem acesso;
 *      3. se DDRESS_SENHA_ADMIN estiver definida, garante a conta de
 *         administrador atendimentoddress@gmail.com com essa palavra-passe.
 */

import "dotenv/config";
import path from "node:path";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { baseEmbutida, criarPool, db, enderecoLegivel, fecharBaseDeDados, urlsDeMigracao } from "./index";
import { users } from "./schema";
import { semear } from "./semente";

const EMAIL_ADMINISTRADOR = "atendimentoddress@gmail.com";

/**
 * Aplica as migrações pelo primeiro endereço que responder.
 *
 * A ligação directa do Supabase só existe em IPv6, que a Vercel não tem;
 * o pooler em modo transacção (6543) não serve para migrar. Por isso
 * tentamos, por ordem, tudo o que está configurado, incluindo o pooler em
 * modo sessão (5432).
 */
async function aplicarMigracoes() {
  const enderecos = urlsDeMigracao();
  if (enderecos.length === 0) throw new Error("Sem endereço de base de dados para migrar.");

  const falhas: string[] = [];
  for (const url of enderecos) {
    const onde = enderecoLegivel(url);
    const pool = criarPool(url, 1);
    try {
      console.log(`[implantar] A aplicar migrações por ${onde}…`);
      await migrate(drizzle(pool), { migrationsFolder: path.join(process.cwd(), "drizzle") });
      console.log(`[implantar] Migrações aplicadas (${onde}).`);
      return;
    } catch (e) {
      const motivo = e instanceof Error ? e.message.split("\n")[0] : String(e);
      console.warn(`[implantar] Falhou por ${onde}: ${motivo}`);
      falhas.push(`${onde} — ${motivo}`);
    } finally {
      await pool.end().catch(() => {});
    }
  }

  throw new Error(
    [
      "Não foi possível aplicar as migrações. Tentámos:",
      ...falhas.map((x) => `  · ${x}`),
      "",
      "Na Vercel use as ligações do pooler do Supabase (aws-…pooler.supabase.com):",
      "  POSTGRES_URL / DATABASE_URL           → porta 6543 (o site)",
      "  POSTGRES_URL_NON_POOLING / _DIRECT    → porta 5432 (migrações)",
      "A ligação directa db.<ref>.supabase.co só responde em IPv6 e a Vercel não lhe chega.",
    ].join("\n")
  );
}

async function main() {
  if (baseEmbutida) {
    console.log("[implantar] Sem base de dados configurada: o site usa a base embutida de demonstração.");
    return;
  }

  await aplicarMigracoes();

  const { rows } = await db.execute(sql`SELECT COUNT(*)::int AS n FROM settings`);
  if ((rows[0] as { n: number }).n === 0) {
    console.log("[implantar] Base vazia: a carregar a demonstração (modo público)…");
    await semear(db, (m) => console.log(`[implantar] ${m}`), {
      modo: "publica",
      senhaAdministrador: process.env.DDRESS_SENHA_ADMIN,
    });
  }

  const senha = process.env.DDRESS_SENHA_ADMIN;
  if (senha) {
    if (senha.length < 10) {
      // Não vale a pena deitar abaixo a implantação por causa disto: o
      // site fica de pé e a palavra-passe antiga continua a servir.
      console.warn("[implantar] DDRESS_SENHA_ADMIN tem menos de 10 caracteres: a conta de administrador ficou como estava.");
      return;
    }
    const hash = bcrypt.hashSync(senha, 10);
    const [existente] = await db.select({ id: users.id }).from(users).where(eq(users.email, EMAIL_ADMINISTRADOR));
    if (existente) {
      await db.update(users).set({ passwordHash: hash, role: "ADMIN", active: true, updatedAt: new Date() }).where(eq(users.id, existente.id));
    } else {
      await db.insert(users).values({ name: "Administrador DDRESS", email: EMAIL_ADMINISTRADOR, passwordHash: hash, role: "ADMIN" });
    }
    console.log(`[implantar] Conta de administrador pronta: ${EMAIL_ADMINISTRADOR}.`);
  } else {
    console.log("[implantar] DDRESS_SENHA_ADMIN não definida: a conta de administrador não foi alterada.");
  }
}

main()
  .catch((e) => {
    // Não deita a publicação abaixo: o site arranca, confirma a base e, se
    // ela não servir, usa a de demonstração e diz porquê em /api/saude.
    console.error("[implantar] ==============================================");
    console.error("[implantar] A base de dados configurada NÃO ficou pronta:");
    console.error("[implantar]", e instanceof Error ? e.message : e);
    console.error("[implantar] A publicação continua; veja /api/saude depois.");
    console.error("[implantar] ==============================================");
  })
  .finally(() => fecharBaseDeDados());
