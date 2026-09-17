import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, ehBaseEmbutida } from "@/db";
import { armazenamentoConfigurado, ondeGuardamos } from "@/lib/armazenamento";
import { emailConfigurado } from "@/lib/email";
import { telegramConfigurado } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico da implantação. Só diz QUE variáveis existem e se a base
 * responde — nunca mostra valores.
 */
export async function GET() {
  const existe = (n: string) => !!process.env[n];
  let base: { responde: boolean; pedidos?: number; erro?: string };
  try {
    const { rows } = await db.execute(sql`SELECT COUNT(*)::int AS n FROM orders`);
    base = { responde: true, pedidos: (rows[0] as { n: number }).n };
  } catch (e) {
    base = { responde: false, erro: e instanceof Error ? e.message.split("\n")[0].slice(0, 120) : "erro" };
  }

  return NextResponse.json({
    modo: ehBaseEmbutida() ? "base-embutida-demonstracao" : "postgresql",
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
