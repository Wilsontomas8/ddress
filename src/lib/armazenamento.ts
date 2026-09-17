import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { uploads } from "@/db/schema";

/**
 * Ficheiros carregados pelo painel (fotografias das peças, vídeos, facturas).
 *
 * Em produção vão para o Supabase Storage:
 *   SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_BUCKET (opcional, "ddress" por omissão)
 *
 * Sem essas variáveis, e só fora da Vercel, o ficheiro fica em
 * public/carregados — serve para trabalhar no computador. Na Vercel sem
 * Storage o carregamento é recusado com uma explicação, em vez de gravar
 * num disco que desaparece.
 */

export const TIPOS_DE_IMAGEM = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const TIPOS_DE_VIDEO = ["video/mp4", "video/webm"];
export const TIPOS_DE_DOCUMENTO = ["application/pdf"];

/** Limites por tipo, em bytes */
export const LIMITES = {
  IMAGEM: 8 * 1024 * 1024,
  VIDEO: 60 * 1024 * 1024,
  DOCUMENTO: 12 * 1024 * 1024,
};

export type EspecieDeFicheiro = keyof typeof LIMITES;

export type ResultadoDoCarregamento =
  | { ok: true; url: string; id: string }
  | { ok: false; erro: string };

const bucket = () => process.env.SUPABASE_BUCKET || "ddress";
const enderecoSupabase = () => (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const chaveSupabase = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function armazenamentoConfigurado(): boolean {
  return !!(enderecoSupabase() && chaveSupabase());
}

/** Onde é que os ficheiros ficam, para o painel explicar à equipa */
export function ondeGuardamos(): "supabase" | "pasta-local" | "nenhum" {
  if (armazenamentoConfigurado()) return "supabase";
  return process.env.VERCEL ? "nenhum" : "pasta-local";
}

export function especieDoTipo(contentType: string): EspecieDeFicheiro | null {
  if (TIPOS_DE_IMAGEM.includes(contentType)) return "IMAGEM";
  if (TIPOS_DE_VIDEO.includes(contentType)) return "VIDEO";
  if (TIPOS_DE_DOCUMENTO.includes(contentType)) return "DOCUMENTO";
  return null;
}

/** Nome limpo e único: sem acentos, sem espaços, sem surpresas */
function nomeSeguro(original: string): string {
  const base = original
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-60);
  return `${randomBytes(6).toString("hex")}-${base || "ficheiro"}`;
}

export async function guardarFicheiro(opts: {
  ficheiro: File;
  pasta: string;
  utilizadorId: string | null;
}): Promise<ResultadoDoCarregamento> {
  const { ficheiro, pasta, utilizadorId } = opts;
  const especie = especieDoTipo(ficheiro.type);
  if (!especie) return { ok: false, erro: "Só aceitamos imagens (JPG, PNG, WebP, AVIF), vídeos MP4/WebM e PDF." };
  if (ficheiro.size > LIMITES[especie]) {
    return { ok: false, erro: `Ficheiro grande demais: o limite são ${Math.round(LIMITES[especie] / 1024 / 1024)} MB.` };
  }

  const pastaLimpa = pasta.replace(/[^a-z0-9-]/gi, "") || "geral";
  const caminho = `${pastaLimpa}/${nomeSeguro(ficheiro.name)}`;
  const dados = Buffer.from(await ficheiro.arrayBuffer());

  let url: string;
  if (armazenamentoConfigurado()) {
    const resposta = await fetch(`${enderecoSupabase()}/storage/v1/object/${bucket()}/${caminho}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chaveSupabase()}`,
        "Content-Type": ficheiro.type,
        "x-upsert": "true",
        "cache-control": "31536000",
      },
      body: new Uint8Array(dados),
    });
    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => "");
      console.error("Supabase Storage:", resposta.status, detalhe.slice(0, 300));
      return { ok: false, erro: "O armazenamento recusou o ficheiro. Confirme o bucket na Supabase." };
    }
    url = `${enderecoSupabase()}/storage/v1/object/public/${bucket()}/${caminho}`;
  } else if (process.env.VERCEL) {
    return {
      ok: false,
      erro: "O armazenamento de ficheiros ainda não está ligado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.",
    };
  } else {
    const destino = path.join(process.cwd(), "public", "carregados", pastaLimpa);
    await mkdir(destino, { recursive: true });
    await writeFile(path.join(destino, path.basename(caminho)), dados);
    url = `/carregados/${caminho}`;
  }

  const [registo] = await db
    .insert(uploads)
    .values({
      url,
      path: caminho,
      kind: especie,
      contentType: ficheiro.type,
      size: ficheiro.size,
      originalName: ficheiro.name.slice(0, 120),
      uploadedById: utilizadorId,
    })
    .returning({ id: uploads.id });

  return { ok: true, url, id: registo.id };
}
