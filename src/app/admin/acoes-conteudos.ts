"use server";

/**
 * Acções do painel para conteúdos: permissões, colecções, Quem somos,
 * vídeos e imagens, parceiros, solicitações, notificações e sapatos
 * sugeridos. Cada acção valida no servidor a permissão de edição da sua
 * área e fica registada na auditoria.
 */

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  collectionProducts,
  collections,
  mediaItems,
  notifications,
  pageHighlights,
  pages,
  partners,
  productSuggestions,
  rolePermissions,
  serviceRequestProducts,
  serviceRequests,
  type Role,
} from "@/db/schema";
import { exigirSeccao } from "@/lib/auth";
import { registarAlteracao } from "@/lib/auditoria";
import { PERFIS_AJUSTAVEIS, RECURSOS, SO_ADMINISTRADOR, type Nivel, type Recurso } from "@/lib/permissoes";
import { ESTADOS_DE_SOLICITACAO, PROXIMOS_ESTADOS_SOLICITACAO, type EstadoDeSolicitacao } from "@/lib/solicitacoes-rotulos";
import { avisarSolicitacaoCriada } from "@/lib/notificacoes";

export type Resultado = { ok: true; mensagem?: string; id?: string } | { ok: false; erro: string };

const texto = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const inteiro = (v: FormDataEntryValue | null, padrao = 0) => {
  const n = parseInt(texto(v), 10);
  return Number.isNaN(n) ? padrao : n;
};
const marcado = (v: FormDataEntryValue | null) => v === "on" || v === "sim" || v === "true";

function slugificar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Caminho do site (/…) ou endereço https; nada de javascript: e afins */
const enderecoDeMedia = z
  .string()
  .trim()
  .min(1, "Indique o endereço do ficheiro.")
  .refine((u) => u.startsWith("/") || /^https:\/\//i.test(u), "Use um caminho do site (/…) ou um endereço https://");

function falha(e: unknown): Resultado {
  if (e instanceof z.ZodError) return { ok: false, erro: e.issues[0]?.message ?? "Dados inválidos." };
  if (e instanceof Error && "status" in e) return { ok: false, erro: e.message };
  console.error(e);
  return { ok: false, erro: "Não foi possível guardar. Tente de novo." };
}

// =====================================================================
//  PERMISSÕES
// =====================================================================

export async function guardarPermissoes(formData: FormData): Promise<Resultado> {
  try {
    const eu = await exigirSeccao("permissoes", "editar");
    const alteracoes: string[] = [];

    for (const role of PERFIS_AJUSTAVEIS) {
      for (const { chave } of RECURSOS) {
        if (SO_ADMINISTRADOR.includes(chave)) continue;
        const nivel = texto(formData.get(`perm:${role}:${chave}`)) as Nivel;
        if (!["nenhum", "ver", "editar"].includes(nivel)) continue;
        const valores = { canView: nivel !== "nenhum", canEdit: nivel === "editar", updatedById: eu.id, updatedAt: new Date() };

        const [antes] = await db
          .select()
          .from(rolePermissions)
          .where(and(eq(rolePermissions.role, role as Role), eq(rolePermissions.resource, chave)));
        const nivelAntes = antes ? (antes.canEdit ? "editar" : antes.canView ? "ver" : "nenhum") : null;
        if (nivelAntes === nivel) continue;

        await db
          .insert(rolePermissions)
          .values({ role: role as Role, resource: chave, ...valores })
          .onConflictDoUpdate({ target: [rolePermissions.role, rolePermissions.resource], set: valores });
        alteracoes.push(`${role}/${chave}: ${nivel}`);
      }
    }

    if (alteracoes.length) {
      await registarAlteracao({ actorId: eu.id, area: "PERMISSOES", acao: "ALTERAR", mensagem: `Permissões alteradas por ${eu.name}: ${alteracoes.join("; ")}.` });
    }
    revalidatePath("/admin", "layout");
    return { ok: true, mensagem: alteracoes.length ? `${alteracoes.length} permissão(ões) actualizada(s).` : "Nada mudou." };
  } catch (e) {
    return falha(e);
  }
}

export async function reporPermissoesPadrao(): Promise<Resultado> {
  try {
    const eu = await exigirSeccao("permissoes", "editar");
    await db.delete(rolePermissions);
    await registarAlteracao({ actorId: eu.id, area: "PERMISSOES", acao: "REPOR", mensagem: `Permissões repostas no padrão por ${eu.name}.` });
    revalidatePath("/admin", "layout");
    return { ok: true, mensagem: "Permissões repostas no padrão." };
  } catch (e) {
    return falha(e);
  }
}

// =====================================================================
//  VÍDEOS E IMAGENS (páginas e colecções)
// =====================================================================

const recursoDoDono = (ownerType: string): Recurso => (ownerType === "COLECCAO" ? "colecoes" : "conteudos");

export async function adicionarMedia(formData: FormData): Promise<Resultado> {
  try {
    const ownerType = texto(formData.get("ownerType")) === "COLECCAO" ? "COLECCAO" : "PAGINA";
    const eu = await exigirSeccao(recursoDoDono(ownerType), "editar");
    const dados = z
      .object({
        ownerId: z.string().min(1),
        kind: z.enum(["VIDEO", "IMAGEM"]),
        url: enderecoDeMedia,
        poster: z.string().trim().optional(),
        title: z.string().trim().max(120).optional(),
      })
      .parse({
        ownerId: texto(formData.get("ownerId")),
        kind: texto(formData.get("kind")) || "IMAGEM",
        url: texto(formData.get("url")),
        poster: texto(formData.get("poster")) || undefined,
        title: texto(formData.get("title")) || undefined,
      });
    const [{ max }] = (
      await db.execute(sql`SELECT COALESCE(MAX(position), -1)::int AS max FROM media_items WHERE owner_type = ${ownerType} AND owner_id = ${dados.ownerId}`)
    ).rows as { max: number }[];
    await db.insert(mediaItems).values({ ownerType, ownerId: dados.ownerId, kind: dados.kind, url: dados.url, poster: dados.poster || null, title: dados.title ?? "", position: max + 1 });
    await registarAlteracao({ actorId: eu.id, area: ownerType === "COLECCAO" ? "COLECCAO" : "CONTEUDO", acao: "MEDIA_ADICIONAR", entidadeId: dados.ownerId, mensagem: `${dados.kind === "VIDEO" ? "Vídeo" : "Imagem"} acrescentado(a): ${dados.url}.` });
    revalidatePath("/", "layout");
    return { ok: true, mensagem: "Acrescentado." };
  } catch (e) {
    return falha(e);
  }
}

export async function removerMedia(id: string): Promise<Resultado> {
  try {
    const [m] = await db.select().from(mediaItems).where(eq(mediaItems.id, id));
    if (!m) return { ok: false, erro: "Já não existe." };
    const eu = await exigirSeccao(recursoDoDono(m.ownerType), "editar");
    await db.delete(mediaItems).where(eq(mediaItems.id, id));
    await registarAlteracao({ actorId: eu.id, area: m.ownerType === "COLECCAO" ? "COLECCAO" : "CONTEUDO", acao: "MEDIA_REMOVER", entidadeId: m.ownerId, mensagem: `Removido: ${m.url}.` });
    revalidatePath("/", "layout");
    return { ok: true, mensagem: "Removido." };
  } catch (e) {
    return falha(e);
  }
}

export async function moverMedia(id: string, direccao: -1 | 1): Promise<Resultado> {
  try {
    const [m] = await db.select().from(mediaItems).where(eq(mediaItems.id, id));
    if (!m) return { ok: false, erro: "Já não existe." };
    await exigirSeccao(recursoDoDono(m.ownerType), "editar");
    const irmaos = await db
      .select()
      .from(mediaItems)
      .where(and(eq(mediaItems.ownerType, m.ownerType), eq(mediaItems.ownerId, m.ownerId)))
      .orderBy(mediaItems.position);
    const i = irmaos.findIndex((x) => x.id === id);
    const j = i + direccao;
    if (j < 0 || j >= irmaos.length) return { ok: true };
    [irmaos[i], irmaos[j]] = [irmaos[j], irmaos[i]];
    for (const [position, x] of irmaos.entries()) {
      if (x.position !== position) await db.update(mediaItems).set({ position }).where(eq(mediaItems.id, x.id));
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return falha(e);
  }
}

// =====================================================================
//  COLECÇÕES
// =====================================================================

export async function guardarColecao(formData: FormData): Promise<Resultado> {
  try {
    const eu = await exigirSeccao("colecoes", "editar");
    const id = texto(formData.get("id"));
    const nome = z.string().min(2, "Indique o nome da colecção.").parse(texto(formData.get("name")));
    const slug = slugificar(texto(formData.get("slug")) || nome);
    const opcional = (campo: string) => {
      const v = texto(formData.get(campo));
      return v ? enderecoDeMedia.parse(v) : null;
    };
    const valores = {
      name: nome,
      slug,
      tagline: texto(formData.get("tagline")),
      description: texto(formData.get("description")),
      coverImage: opcional("coverImage"),
      heroVideo: opcional("heroVideo"),
      heroPoster: opcional("heroPoster"),
      position: inteiro(formData.get("position")),
      featured: marcado(formData.get("featured")),
      active: marcado(formData.get("active")),
      updatedAt: new Date(),
    };

    const [repetida] = await db.select({ id: collections.id }).from(collections).where(eq(collections.slug, slug));
    if (repetida && repetida.id !== id) return { ok: false, erro: "Já existe uma colecção com esse endereço." };

    let colecaoId = id;
    if (id) {
      await db.update(collections).set(valores).where(eq(collections.id, id));
    } else {
      const [nova] = await db.insert(collections).values(valores).returning({ id: collections.id });
      colecaoId = nova.id;
    }

    // Peças da colecção, pela ordem em que aparecem marcadas
    const pecas = formData.getAll("produtos").map(String);
    await db.delete(collectionProducts).where(eq(collectionProducts.collectionId, colecaoId));
    if (pecas.length) {
      await db.insert(collectionProducts).values(pecas.map((productId, position) => ({ collectionId: colecaoId, productId, position })));
    }

    await registarAlteracao({ actorId: eu.id, area: "COLECCAO", acao: id ? "EDITAR" : "CRIAR", entidadeId: colecaoId, mensagem: `Colecção "${nome}" ${id ? "editada" : "criada"} por ${eu.name} (${pecas.length} peças).` });
    revalidatePath("/", "layout");
    return { ok: true, mensagem: "Colecção guardada.", id: colecaoId };
  } catch (e) {
    return falha(e);
  }
}

export async function apagarColecao(id: string): Promise<Resultado> {
  try {
    const eu = await exigirSeccao("colecoes", "editar");
    const [c] = await db.select().from(collections).where(eq(collections.id, id));
    if (!c) return { ok: false, erro: "Já não existe." };
    await db.delete(mediaItems).where(and(eq(mediaItems.ownerType, "COLECCAO"), eq(mediaItems.ownerId, id)));
    await db.delete(collections).where(eq(collections.id, id));
    await registarAlteracao({ actorId: eu.id, area: "COLECCAO", acao: "APAGAR", entidadeId: id, mensagem: `Colecção "${c.name}" apagada por ${eu.name}. As peças continuam no catálogo.` });
    revalidatePath("/", "layout");
    return { ok: true, mensagem: "Colecção apagada." };
  } catch (e) {
    return falha(e);
  }
}

// =====================================================================
//  PÁGINAS (Quem somos)
// =====================================================================

export async function guardarPagina(formData: FormData): Promise<Resultado> {
  try {
    const eu = await exigirSeccao("conteudos", "editar");
    const id = z.string().min(1).parse(texto(formData.get("id")));
    await db
      .update(pages)
      .set({
        title: z.string().min(2, "Indique o título.").parse(texto(formData.get("title"))),
        subtitle: texto(formData.get("subtitle")),
        body: texto(formData.get("body")),
        published: marcado(formData.get("published")),
        updatedById: eu.id,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, id));
    await registarAlteracao({ actorId: eu.id, area: "CONTEUDO", acao: "EDITAR", entidadeId: id, mensagem: `Página "Quem somos" editada por ${eu.name}.` });
    revalidatePath("/", "layout");
    return { ok: true, mensagem: "Página guardada." };
  } catch (e) {
    return falha(e);
  }
}

export async function guardarDestaque(formData: FormData): Promise<Resultado> {
  try {
    const eu = await exigirSeccao("conteudos", "editar");
    const id = texto(formData.get("id"));
    const valores = {
      icon: texto(formData.get("icon")) || "estrela",
      text: z.string().min(2, "Escreva o destaque.").max(120).parse(texto(formData.get("text"))),
      position: inteiro(formData.get("position")),
    };
    if (id) {
      await db.update(pageHighlights).set(valores).where(eq(pageHighlights.id, id));
    } else {
      await db.insert(pageHighlights).values({ ...valores, pageId: z.string().min(1).parse(texto(formData.get("pageId"))) });
    }
    await registarAlteracao({ actorId: eu.id, area: "CONTEUDO", acao: id ? "DESTAQUE_EDITAR" : "DESTAQUE_CRIAR", mensagem: `Destaque "${valores.text}" guardado por ${eu.name}.` });
    revalidatePath("/", "layout");
    return { ok: true, mensagem: "Destaque guardado." };
  } catch (e) {
    return falha(e);
  }
}

export async function apagarDestaque(id: string): Promise<Resultado> {
  try {
    const eu = await exigirSeccao("conteudos", "editar");
    const [d] = await db.select().from(pageHighlights).where(eq(pageHighlights.id, id));
    await db.delete(pageHighlights).where(eq(pageHighlights.id, id));
    await registarAlteracao({ actorId: eu.id, area: "CONTEUDO", acao: "DESTAQUE_APAGAR", mensagem: `Destaque "${d?.text ?? id}" apagado por ${eu.name}.` });
    revalidatePath("/", "layout");
    return { ok: true, mensagem: "Destaque apagado." };
  } catch (e) {
    return falha(e);
  }
}

// =====================================================================
//  PARCEIROS
// =====================================================================

export async function guardarParceiro(formData: FormData): Promise<Resultado> {
  try {
    const eu = await exigirSeccao("parceiros", "editar");
    const id = texto(formData.get("id"));
    const nome = z.string().min(2, "Indique o nome.").parse(texto(formData.get("name")));
    const logo = texto(formData.get("logoUrl"));
    const instagram = texto(formData.get("instagram"));
    const email = texto(formData.get("email"));
    const valores = {
      name: nome,
      slug: slugificar(texto(formData.get("slug")) || nome),
      service: texto(formData.get("service")) === "OUTRO" ? "OUTRO" : "MAQUILHAGEM",
      description: texto(formData.get("description")),
      logoUrl: logo ? enderecoDeMedia.parse(logo) : null,
      instagram: instagram ? z.string().url("Endereço do Instagram inválido.").parse(instagram) : null,
      whatsapp: texto(formData.get("whatsapp")) || null,
      email: email ? z.string().email("E-mail inválido.").parse(email) : null,
      active: marcado(formData.get("active")),
      position: inteiro(formData.get("position")),
      updatedAt: new Date(),
    };
    let parceiroId = id;
    if (id) {
      await db.update(partners).set(valores).where(eq(partners.id, id));
    } else {
      const [novo] = await db.insert(partners).values(valores).returning({ id: partners.id });
      parceiroId = novo.id;
    }
    await registarAlteracao({ actorId: eu.id, area: "PARCEIRO", acao: id ? "EDITAR" : "CRIAR", entidadeId: parceiroId, mensagem: `Parceiro "${nome}" ${id ? "editado" : "criado"} por ${eu.name}.` });
    revalidatePath("/", "layout");
    return { ok: true, mensagem: "Parceiro guardado.", id: parceiroId };
  } catch (e) {
    return falha(e);
  }
}

export async function apagarParceiro(id: string): Promise<Resultado> {
  try {
    const eu = await exigirSeccao("parceiros", "editar");
    const [p] = await db.select().from(partners).where(eq(partners.id, id));
    if (!p) return { ok: false, erro: "Já não existe." };
    // As solicitações antigas mantêm-se (partner_id passa a vazio).
    await db.delete(partners).where(eq(partners.id, id));
    await registarAlteracao({ actorId: eu.id, area: "PARCEIRO", acao: "APAGAR", entidadeId: id, mensagem: `Parceiro "${p.name}" apagado por ${eu.name}.` });
    revalidatePath("/", "layout");
    return { ok: true, mensagem: "Parceiro apagado." };
  } catch (e) {
    return falha(e);
  }
}

// =====================================================================
//  SOLICITAÇÕES
// =====================================================================

export async function mudarEstadoSolicitacao(id: string, estado: EstadoDeSolicitacao): Promise<Resultado> {
  try {
    const eu = await exigirSeccao("solicitacoes", "editar");
    const [s] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id));
    if (!s) return { ok: false, erro: "Solicitação não encontrada." };
    if (!ESTADOS_DE_SOLICITACAO.includes(estado) || !PROXIMOS_ESTADOS_SOLICITACAO[s.status as EstadoDeSolicitacao]?.includes(estado)) {
      return { ok: false, erro: "Essa mudança de estado não é possível." };
    }
    await db.update(serviceRequests).set({ status: estado, handledById: eu.id, updatedAt: new Date() }).where(eq(serviceRequests.id, id));
    await registarAlteracao({ actorId: eu.id, area: "SOLICITACAO", acao: "ESTADO", entidadeId: id, mensagem: `Solicitação ${s.code} passou a ${estado} (${eu.name}).` });
    revalidatePath("/admin/solicitacoes");
    revalidatePath(`/admin/solicitacoes/${id}`);
    return { ok: true, mensagem: "Estado actualizado." };
  } catch (e) {
    return falha(e);
  }
}

export async function guardarNotaSolicitacao(formData: FormData): Promise<Resultado> {
  try {
    const eu = await exigirSeccao("solicitacoes", "editar");
    const id = texto(formData.get("id"));
    await db.update(serviceRequests).set({ staffNote: texto(formData.get("staffNote")) || null, handledById: eu.id, updatedAt: new Date() }).where(eq(serviceRequests.id, id));
    revalidatePath(`/admin/solicitacoes/${id}`);
    return { ok: true, mensagem: "Nota guardada." };
  } catch (e) {
    return falha(e);
  }
}

/** A loja sugere sapatos à cliente numa solicitação */
export async function sugerirSapatos(formData: FormData): Promise<Resultado> {
  try {
    const eu = await exigirSeccao("solicitacoes", "editar");
    const id = texto(formData.get("id"));
    const escolhidos = formData.getAll("produtos").map(String);
    await db.delete(serviceRequestProducts).where(and(eq(serviceRequestProducts.requestId, id), eq(serviceRequestProducts.source, "LOJA")));
    if (escolhidos.length) {
      await db
        .insert(serviceRequestProducts)
        .values(escolhidos.map((productId) => ({ requestId: id, productId, source: "LOJA" })))
        .onConflictDoNothing();
    }
    await registarAlteracao({ actorId: eu.id, area: "SOLICITACAO", acao: "SUGERIR", entidadeId: id, mensagem: `${escolhidos.length} sapato(s) sugerido(s) por ${eu.name}.` });
    revalidatePath(`/admin/solicitacoes/${id}`);
    return { ok: true, mensagem: "Sugestões guardadas." };
  } catch (e) {
    return falha(e);
  }
}

/** Volta a tentar os avisos de uma solicitação (ex.: depois de configurar o e-mail) */
export async function reenviarAvisosSolicitacao(id: string): Promise<Resultado> {
  try {
    await exigirSeccao("solicitacoes", "editar");
    await db.delete(notifications).where(and(eq(notifications.requestId, id), eq(notifications.channel, "EMAIL")));
    await avisarSolicitacaoCriada(id);
    revalidatePath(`/admin/solicitacoes/${id}`);
    return { ok: true, mensagem: "Avisos reenviados." };
  } catch (e) {
    return falha(e);
  }
}

// =====================================================================
//  NOTIFICAÇÕES
// =====================================================================

export async function marcarNotificacaoLida(id: string): Promise<Resultado> {
  try {
    await exigirSeccao("notificacoes", "ver");
    await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, id), isNull(notifications.readAt)));
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return falha(e);
  }
}

export async function marcarTodasLidas(): Promise<Resultado> {
  try {
    await exigirSeccao("notificacoes", "ver");
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.audience, "LOJA"), eq(notifications.channel, "SITE"), isNull(notifications.readAt)));
    revalidatePath("/admin", "layout");
    return { ok: true, mensagem: "Todas marcadas como lidas." };
  } catch (e) {
    return falha(e);
  }
}

// =====================================================================
//  SAPATOS SUGERIDOS E COLECÇÕES DE UMA PEÇA
// =====================================================================

export async function guardarLigacoesDaPeca(formData: FormData): Promise<Resultado> {
  try {
    const eu = await exigirSeccao("produtos", "editar");
    const productId = z.string().min(1).parse(texto(formData.get("productId")));
    const sugeridos = formData.getAll("sugeridos").map(String).filter((x) => x !== productId);
    const colecoesMarcadas = formData.getAll("colecoes").map(String);

    await db.delete(productSuggestions).where(eq(productSuggestions.productId, productId));
    if (sugeridos.length) {
      await db.insert(productSuggestions).values(sugeridos.map((suggestedProductId, position) => ({ productId, suggestedProductId, position })));
    }

    await db.delete(collectionProducts).where(eq(collectionProducts.productId, productId));
    for (const collectionId of colecoesMarcadas) {
      const [{ max }] = (
        await db.execute(sql`SELECT COALESCE(MAX(position), -1)::int AS max FROM collection_products WHERE collection_id = ${collectionId}`)
      ).rows as { max: number }[];
      await db.insert(collectionProducts).values({ collectionId, productId, position: max + 1 });
    }

    await registarAlteracao({ actorId: eu.id, area: "PRODUTO", acao: "LIGACOES", entidadeId: productId, mensagem: `Sapatos sugeridos (${sugeridos.length}) e colecções (${colecoesMarcadas.length}) actualizados por ${eu.name}.` });
    revalidatePath("/", "layout");
    return { ok: true, mensagem: "Guardado." };
  } catch (e) {
    return falha(e);
  }
}
