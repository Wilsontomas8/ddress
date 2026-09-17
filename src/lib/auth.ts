import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, ehBaseEmbutida } from "@/db";
import { users, type Role } from "@/db/schema";
import { ehPerfilDeEquipa, podeVer, type Seccao } from "./permissoes";

export const COOKIE_NAME = "wil_sessao";
const DURACAO_DIAS = 30;

// Só para desenvolvimento local e para a demonstração da Fase 1 (base
// embutida, dados fictícios). Com uma base de dados real o AUTH_SECRET é
// obrigatório e este valor nunca é usado.
const SEGREDO_DE_DESENVOLVIMENTO = "ddress-desenvolvimento-local-nao-usar-em-producao";

/**
 * Segredo que assina as sessões, por ordem de preferência:
 *  1. AUTH_SECRET;
 *  2. derivado do SUPABASE_JWT_SECRET que a integração do Supabase cria na
 *     Vercel (HMAC com um rótulo próprio: o segredo original não é usado
 *     tal como está nem sai do servidor);
 *  3. valor de desenvolvimento, só sem base de dados real.
 */
function segredo(): Uint8Array {
  const supabase = process.env.SUPABASE_JWT_SECRET;
  const s =
    process.env.AUTH_SECRET ||
    (supabase ? createHmac("sha256", supabase).update("ddress-sessoes-v1").digest("base64") : undefined) ||
    (process.env.NODE_ENV !== "production" || ehBaseEmbutida() ? SEGREDO_DE_DESENVOLVIMENTO : undefined);
  if (!s || s.length < 16) {
    throw new Error(
      "AUTH_SECRET em falta ou demasiado curto. Defina-o no ficheiro .env (openssl rand -base64 48)."
    );
  }
  return new TextEncoder().encode(s);
}

export type Sessao = {
  id: string;
  nome: string;
  email: string;
  role: Role;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function criarToken(sessao: Sessao): Promise<string> {
  return new SignJWT({ ...sessao })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_DIAS}d`)
    .sign(segredo());
}

export async function lerToken(token: string): Promise<Sessao | null> {
  try {
    const { payload } = await jwtVerify(token, segredo());
    if (!payload.id || !payload.email) return null;
    return {
      id: String(payload.id),
      nome: String(payload.nome ?? ""),
      email: String(payload.email),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function iniciarSessao(sessao: Sessao) {
  const token = await criarToken(sessao);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_DIAS * 24 * 60 * 60,
  });
}

export async function terminarSessao() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/** Sessão atual (ou null). Para Server Components. */
export async function getSessao(): Promise<Sessao | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return lerToken(token);
}

/** Sessão + confirmação de que o utilizador existe e está ativo. */
export async function getUtilizador() {
  const sessao = await getSessao();
  if (!sessao) return null;
  const [user] = await db.select().from(users).where(eq(users.id, sessao.id));
  if (!user || !user.active) return null;
  return user;
}

/** Tem acesso ao painel de gestão? */
export function ehEquipa(role: Role | undefined | null): boolean {
  return ehPerfilDeEquipa(role);
}

export class RespostaDeErro extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Para rotas de API: devolve o utilizador ou lança 401/403. */
export async function exigirEquipa() {
  const user = await getUtilizador();
  if (!user) throw new RespostaDeErro("Precisa de iniciar sessão.", 401);
  if (!ehEquipa(user.role)) {
    throw new RespostaDeErro("Sem permissão para esta operação.", 403);
  }
  return user;
}

/** Para rotas e acções por secção do painel. */
export async function exigirSeccao(seccao: Seccao) {
  const user = await getUtilizador();
  if (!user) throw new RespostaDeErro("Precisa de iniciar sessão.", 401);
  if (!podeVer(user.role, seccao)) {
    throw new RespostaDeErro("O seu perfil não tem acesso a esta área.", 403);
  }
  return user;
}

export async function exigirAdmin() {
  const user = await getUtilizador();
  if (!user) throw new RespostaDeErro("Precisa de iniciar sessão.", 401);
  if (user.role !== "ADMIN") {
    throw new RespostaDeErro("Apenas o administrador pode fazer isto.", 403);
  }
  return user;
}
