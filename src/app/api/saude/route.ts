import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, ehBaseEmbutida, ligacaoEmbutida, motivoDaFalhaDaBase, urlDaBase } from "@/db";
import { avisosDaLigacao } from "@/lib/diagnostico-ligacao";
import { verificarEmail } from "@/lib/email";
import { getSessao } from "@/lib/auth";
import { ehPerfilDeEquipa } from "@/lib/permissoes";
import { prepararBaseDeDados } from "@/db/preparar";
import { armazenamentoConfigurado, ondeGuardamos } from "@/lib/armazenamento";
import { emailConfigurado } from "@/lib/email";
import { telegramConfigurado } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico da implantação. Só diz QUE variáveis existem e se a base
 * responde — nunca mostra valores.
 */
export async function GET(request: Request) {
  const existe = (n: string) => !!process.env[n];
  await prepararBaseDeDados();
  const configurada = !ehBaseEmbutida();
  const motivo = motivoDaFalhaDaBase();
  let base: { responde: boolean; pedidos?: number; erro?: string };
  try {
    const { rows } = await db.execute(sql`SELECT COUNT(*)::int AS n FROM orders`);
    base = { responde: true, pedidos: (rows[0] as { n: number }).n };
  } catch (e) {
    base = { responde: false, erro: e instanceof Error ? e.message.split("\n")[0].slice(0, 120) : "erro" };
  }

  // ?verificar=email faz o login SMTP (sem enviar nada); só para a equipa,
  // para ninguém de fora poder bater à porta do Gmail repetidamente.
  const querVerificar = new URL(request.url).searchParams.get("verificar") === "email";
  const sessao = querVerificar ? await getSessao() : null;
  const verificacaoEmail =
    querVerificar && sessao && ehPerfilDeEquipa(sessao.role) ? await verificarEmail() : undefined;

  return NextResponse.json({
    ...(verificacaoEmail ? { verificacaoEmail } : {}),
    modo: !ligacaoEmbutida() ? "postgresql" : configurada ? "base-embutida-por-falha" : "base-embutida-demonstracao",
    ...(motivo ? { falhaDaBaseConfigurada: motivo, avisosDaLigacao: avisosDaLigacao(urlDaBase()) } : {}),
    variaveis: {
      DATABASE_URL: existe("DATABASE_URL"),
      POSTGRES_URL: existe("POSTGRES_URL"),
      POSTGRES_URL_NON_POOLING: existe("POSTGRES_URL_NON_POOLING"),
      AUTH_SECRET: existe("AUTH_SECRET"),
      SUPABASE_JWT_SECRET: existe("SUPABASE_JWT_SECRET"),
      DDRESS_SENHA_ADMIN: existe("DDRESS_SENHA_ADMIN"),
      CRON_SECRET: existe("CRON_SECRET"),
      SUPABASE_URL: existe("SUPABASE_URL") || existe("NEXT_PUBLIC_SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: existe("SUPABASE_SERVICE_ROLE_KEY"),
      SMTP_HOST: existe("SMTP_HOST"),
      SMTP_USER: existe("SMTP_USER"),
      SMTP_PASS: existe("SMTP_PASS"),
      RESEND_API_KEY: existe("RESEND_API_KEY"),
      TELEGRAM_BOT_TOKEN: existe("TELEGRAM_BOT_TOKEN"),
      TELEGRAM_CHAT_ID: existe("TELEGRAM_CHAT_ID"),
      NEXT_PUBLIC_SITE_URL: existe("NEXT_PUBLIC_SITE_URL"),
    },
    servicos: {
      email: emailConfigurado() ? "configurado" : "por-configurar",
      ficheiros: armazenamentoConfigurado() ? "supabase-storage" : ondeGuardamos(),
      telegram: telegramConfigurado() ? "configurado" : "por-configurar",
    },
    base,
  });
}
