import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  collectionProducts,
  collections,
  mediaItems,
  pageHighlights,
  pages,
  partners,
  productImages,
  productSuggestions,
  products,
} from "@/db/schema";
import { listarProdutos } from "./catalogo";

export async function mediaDe(ownerType: "PAGINA" | "COLECCAO", ownerId: string) {
  return db
    .select()
    .from(mediaItems)
    .where(and(eq(mediaItems.ownerType, ownerType), eq(mediaItems.ownerId, ownerId)))
    .orderBy(asc(mediaItems.position));
}

/** Página de conteúdo com destaques e vídeos/imagens */
export async function getPagina(slug: string, { mesmoNaoPublicada = false } = {}) {
  const [pagina] = await db.select().from(pages).where(eq(pages.slug, slug));
  if (!pagina || (!pagina.published && !mesmoNaoPublicada)) return null;
  const [destaques, media] = await Promise.all([
    db.select().from(pageHighlights).where(eq(pageHighlights.pageId, pagina.id)).orderBy(asc(pageHighlights.position)),
    mediaDe("PAGINA", pagina.id),
  ]);
  return { pagina, destaques, media };
}

export async function listarColecoes({ incluirInactivas = false } = {}) {
  return db
    .select()
    .from(collections)
    .where(incluirInactivas ? undefined : eq(collections.active, true))
    .orderBy(asc(collections.position), asc(collections.name));
}

export async function getColecao(slug: string) {
  const [colecao] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.slug, slug), eq(collections.active, true)));
  if (!colecao) return null;
  const [media, pecas] = await Promise.all([mediaDe("COLECCAO", colecao.id), listarProdutos({ colecaoId: colecao.id })]);

  // Ordem definida no painel
  const ordem = await db
    .select({ productId: collectionProducts.productId, position: collectionProducts.position })
    .from(collectionProducts)
    .where(eq(collectionProducts.collectionId, colecao.id));
  const posicao = new Map(ordem.map((o) => [o.productId, o.position]));
  pecas.sort((a, b) => (posicao.get(a.id) ?? 0) - (posicao.get(b.id) ?? 0));

  return { colecao, media, pecas };
}

export async function listarParceiros({ servico, incluirInactivos = false }: { servico?: string; incluirInactivos?: boolean } = {}) {
  const condicoes = [];
  if (servico) condicoes.push(eq(partners.service, servico));
  if (!incluirInactivos) condicoes.push(eq(partners.active, true));
  return db
    .select()
    .from(partners)
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(asc(partners.position), asc(partners.name));
}

/** Sapatos (ou outras peças) sugeridos pela loja para uma peça */
export async function sugestoesDe(productId: string) {
  const linhas = await db
    .select({ id: productSuggestions.suggestedProductId, position: productSuggestions.position })
    .from(productSuggestions)
    .where(eq(productSuggestions.productId, productId))
    .orderBy(asc(productSuggestions.position));
  const pecas = await listarProdutos({ ids: linhas.map((l) => l.id) });
  const posicao = new Map(linhas.map((l) => [l.id, l.position]));
  return pecas.sort((a, b) => (posicao.get(a.id) ?? 0) - (posicao.get(b.id) ?? 0));
}

/** Ids dos produtos da categoria Sapatos (todas as secções) */
export async function idsDeSapatos(): Promise<string[]> {
  const linhas = await db
    .select({ id: products.id })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(categories.slug, "sapatos"), eq(products.active, true)));
  return linhas.map((l) => l.id);
}

/** Procura de sapatos para a cliente: por nome/descrição e tamanho disponível */
export async function procurarSapatos(q?: string, limite = 24) {
  const ids = await idsDeSapatos();
  if (ids.length === 0) return [];
  return listarProdutos({ ids, q: q?.trim() || undefined, limite });
}

export async function colecoesDoProduto(productId: string) {
  const linhas = await db
    .select({ id: collections.id, name: collections.name, slug: collections.slug })
    .from(collectionProducts)
    .innerJoin(collections, eq(collectionProducts.collectionId, collections.id))
    .where(and(eq(collectionProducts.productId, productId), eq(collections.active, true)));
  return linhas;
}


/** Lista curta de peças para escolher no painel (colecções, sugestões) */
export async function pecasParaEscolher({ soSapatos = false } = {}) {
  return db
    .select({
      id: products.id,
      name: products.name,
      categoria: categories.name,
      imagem: sql<string | null>`(
        SELECT url FROM ${productImages}
        WHERE ${productImages.productId} = ${products.id}
        ORDER BY ${productImages.position} LIMIT 1
      )`,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(soSapatos ? eq(categories.slug, "sapatos") : undefined)
    .orderBy(asc(categories.name), asc(products.name));
}
