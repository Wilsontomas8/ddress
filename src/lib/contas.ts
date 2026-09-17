import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts, passwordResets, users } from "@/db/schema";
import { hashPassword } from "./auth";
import { registarAlteracao } from "./auditoria";
import { enviarEmail } from "./email";

/**
 * Contas: recuperação de palavra-passe e travão a tentativas repetidas.
 *
 * O código de recuperação vive uma hora, serve uma vez e nunca é guardado
 * em claro — só o seu resumo (SHA-256). As respostas são iguais para
 * e-mails que existem e que não existem, para não revelar quem tem conta.
 */

/** Tentativas erradas toleradas por e-mail ou por endereço, na janela */
export const LIMITE_DE_TENTATIVAS = 8;
export const JANELA_DE_TENTATIVAS_MIN = 15;
const VALIDADE_DO_CODIGO_MIN = 60;

const resumo = (v: string) => createHash("sha256").update(v).digest("hex");

function urlDoSite(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");
}

export function enderecoDoPedido(request: Request): string {
  const encaminhado = request.headers.get("x-forwarded-for") ?? "";
  return (encaminhado.split(",")[0] || request.headers.get("x-real-ip") || "").trim();
}

// =====================================================================
//  TRAVÃO A TENTATIVAS DE ENTRADA
// =====================================================================

export async function registarTentativa(email: string, ip: string, ok: boolean) {
  await db.insert(loginAttempts).values({ email: email.toLowerCase(), ip, ok });
}

/** true quando já houve tentativas erradas a mais neste e-mail ou endereço */
export async function tentativasEsgotadas(email: string, ip: string): Promise<boolean> {
  const desde = new Date(Date.now() - JANELA_DE_TENTATIVAS_MIN * 60_000);
  const contar = async (condicao: ReturnType<typeof eq>) => {
    const [r] = await db
      .select({ n: count() })
      .from(loginAttempts)
      .where(and(eq(loginAttempts.ok, false), gte(loginAttempts.createdAt, desde), condicao));
    return r?.n ?? 0;
  };
  if ((await contar(eq(loginAttempts.email, email.toLowerCase()))) >= LIMITE_DE_TENTATIVAS) return true;
  return !!ip && (await contar(eq(loginAttempts.ip, ip))) >= LIMITE_DE_TENTATIVAS * 2;
}

/** Limpa o travão de um e-mail (usado depois de mudar a palavra-passe) */
async function limparTentativas(email: string) {
  await db.delete(loginAttempts).where(and(eq(loginAttempts.email, email.toLowerCase()), eq(loginAttempts.ok, false)));
}

// =====================================================================
//  RECUPERAÇÃO DE PALAVRA-PASSE
// =====================================================================

export type PedidoDeRecuperacao = { enviado: boolean; semConfiguracao: boolean; ligacao?: string };

/**
 * Cria o código e envia-o por e-mail. Devolve sempre o mesmo para fora;
 * `ligacao` só volta preenchida quando o e-mail não está configurado e
 * estamos fora de produção, para se poder continuar a testar.
 */
export async function pedirRecuperacao(email: string, ip: string): Promise<PedidoDeRecuperacao> {
  const emailLimpo = email.toLowerCase().trim();
  const [utilizador] = await db.select().from(users).where(eq(users.email, emailLimpo)).limit(1);
  if (!utilizador || !utilizador.active) return { enviado: false, semConfiguracao: false };

  // Um pedido de cada vez: os anteriores deixam de servir.
  await db.delete(passwordResets).where(and(eq(passwordResets.userId, utilizador.id), isNull(passwordResets.usedAt)));

  const codigo = randomBytes(32).toString("hex");
  await db.insert(passwordResets).values({
    userId: utilizador.id,
    tokenHash: resumo(codigo),
    expiresAt: new Date(Date.now() + VALIDADE_DO_CODIGO_MIN * 60_000),
  });

  const ligacao = `${urlDoSite()}/recuperar/${codigo}`;
  const envio = await enviarEmail({
    para: utilizador.email,
    assunto: "DDRESS — definir nova palavra-passe",
    texto: `Olá, ${utilizador.name.split(" ")[0]}.\n\nRecebemos um pedido para definir uma nova palavra-passe da sua conta DDRESS.\nA ligação abaixo serve uma vez e expira em ${VALIDADE_DO_CODIGO_MIN} minutos.\n\nSe não foi você, ignore este e-mail — nada muda.`,
    ligacao,
  });

  await registarAlteracao({
    actorId: utilizador.id,
    area: "CONTA",
    acao: "RECUPERACAO_PEDIDA",
    entidadeId: utilizador.id,
    mensagem: `Pedido de nova palavra-passe para ${utilizador.email}${ip ? ` (${ip})` : ""}.`,
  });

  if (envio.ok) return { enviado: true, semConfiguracao: false };
  const mostrarLigacao = process.env.NODE_ENV !== "production";
  return { enviado: false, semConfiguracao: envio.semConfiguracao, ligacao: mostrarLigacao ? ligacao : undefined };
}

export type ResultadoDaRedefinicao = { ok: true; email: string } | { ok: false; erro: string };

export async function redefinirPalavraPasse(codigo: string, nova: string): Promise<ResultadoDaRedefinicao> {
  if (nova.length < 8) return { ok: false, erro: "A palavra-passe precisa de pelo menos 8 caracteres." };

  const [pedido] = await db.select().from(passwordResets).where(eq(passwordResets.tokenHash, resumo(codigo))).limit(1);
  if (!pedido || pedido.usedAt || pedido.expiresAt.getTime() < Date.now()) {
    return { ok: false, erro: "Esta ligação já não serve. Peça outra." };
  }

  const [utilizador] = await db.select().from(users).where(eq(users.id, pedido.userId)).limit(1);
  if (!utilizador || !utilizador.active) return { ok: false, erro: "Esta ligação já não serve. Peça outra." };

  await db.update(users).set({ passwordHash: await hashPassword(nova), updatedAt: new Date() }).where(eq(users.id, utilizador.id));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, pedido.id));
  await limparTentativas(utilizador.email);

  await registarAlteracao({
    actorId: utilizador.id,
    area: "CONTA",
    acao: "PALAVRA_PASSE_MUDADA",
    entidadeId: utilizador.id,
    mensagem: `Palavra-passe de ${utilizador.email} definida de novo pela ligação de recuperação.`,
  });

  return { ok: true, email: utilizador.email };
}

/** Só para a página: diz se o código ainda serve, sem o gastar */
export async function codigoDeRecuperacaoServe(codigo: string): Promise<boolean> {
  const [pedido] = await db.select().from(passwordResets).where(eq(passwordResets.tokenHash, resumo(codigo))).limit(1);
  return !!pedido && !pedido.usedAt && pedido.expiresAt.getTime() >= Date.now();
}

/** Comparação de segredos sem dar pistas pelo tempo */
export function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Entradas recentes, para a auditoria de contas */
export async function tentativasRecentes(limite = 100) {
  return db
    .select({
      id: loginAttempts.id,
      email: loginAttempts.email,
      ip: loginAttempts.ip,
      ok: loginAttempts.ok,
      createdAt: loginAttempts.createdAt,
      nome: sql<string | null>`(SELECT u.name FROM users u WHERE lower(u.email) = login_attempts.email LIMIT 1)`,
    })
    .from(loginAttempts)
    .orderBy(desc(loginAttempts.createdAt))
    .limit(limite);
}
