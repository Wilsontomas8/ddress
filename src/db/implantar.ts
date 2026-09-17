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
import { baseEmbutida, criarPool, db, fecharBaseDeDados, urlDeMigracao } from "./index";
import { users } from "./schema";
import { semear } from "./semente";

const EMAIL_ADMINISTRADOR = "atendimentoddress@gmail.com";

async function main() {
  if (baseEmbutida) {
    console.log("[implantar] Sem base de dados configurada: o site usa a base embutida de demonstração.");
    return;
  }

  console.log("[implantar] A aplicar migrações…");
  const pool = criarPool(urlDeMigracao()!, 1);
  try {
    await migrate(drizzle(pool), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  } finally {
    await pool.end();
  }

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
    if (senha.length < 10) throw new Error("DDRESS_SENHA_ADMIN tem de ter pelo menos 10 caracteres.");
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
    console.error("[implantar] Falhou:", e);
    process.exitCode = 1;
  })
  .finally(() => fecharBaseDeDados());
