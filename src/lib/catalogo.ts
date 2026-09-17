import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  productImages,
  productVariants,
  products,
  rentalReservations,
  type Offer,
  type Section,
} from "@/db/schema";
import { ESTADOS_QUE_BLOQUEIAM, estadoDaPeca, type EstadoDaPeca } from "./availability";
import { expirarSeNecessario } from "./reservas";

export type VarianteComEstado = {
  id: string;
  sku: string;
  size: string;
  color: string;
  saleStock: number;
  rentalStock: number;
  /** Estado no calendário de aluguer */
  aluguer: EstadoDaPeca;
};

export type ProdutoDaListagem = {
  id: string;
  nome: string;
  slug: string;
  seccao: Section;
  categoria: { nome: string; slug: string } | null;
  oferta: Offer;
  imagem: string | null;
  salePrice: number | null;
  compareAtPrice: number | null;
  rentalDayPrice: number | null;
  rentalDeposit: number | null;
  requiresFitting: boolean;
  featured: boolean;
  /** Há alguma peça à venda com stock? */
  temStockVenda: boolean;
  /** Há alguma peça livre para alugar hoje? */
  temAluguerLivre: boolean;
  /** Se nenhuma está livre, quando volta a haver */
  aluguerDisponivelDe: Date | null;
};

/**
 * Estado do calendário de aluguer de um conjunto de peças.
 * Uma peça sem reserva está livre; com reserva ativa fica ocupada até
 * ao fim da reserva mais os dias de higienização.
 */
export async function estadoDasPecas(
  variantIds: string[]
): Promise<Map<string, EstadoDaPeca>> {
  const mapa = new Map<string, EstadoDaPeca>();
  if (variantIds.length === 0) return mapa;

  // Reservas expiradas sem prova libertam a peça antes de a mostrarmos.
  await expirarSeNecessario();

  const [variantes, reservas] = await Promise.all([
    db
      .select({ id: productVariants.id, rentalStock: productVariants.rentalStock })
      .from(productVariants)
      .where(inArray(productVariants.id, variantIds)),
    db
      .select({
        variantId: rentalReservations.variantId,
        startDate: rentalReservations.startDate,
        blockUntil: rentalReservations.blockUntil,
        status: rentalReservations.status,
      })
      .from(rentalReservations)
      .where(
        and(
          inArray(rentalReservations.variantId, variantIds),
          inArray(rentalReservations.status, ESTADOS_QUE_BLOQUEIAM)
        )
      ),
  ]);

  for (const v of variantes) {
    const minhas = reservas
      .filter((r) => r.variantId === v.id)
      .map((r) => ({
        startDate: r.startDate,
        blockUntil: r.blockUntil,
        status: r.status,
      }));
    mapa.set(v.id, estadoDaPeca(v.rentalStock, minhas));
  }

  return mapa;
}

type FiltrosListagem = {
  seccao?: Section;
  categoriaSlug?: string;
  /** "venda" | "aluguer" */
  tipo?: string;
  q?: string;
  /** "recentes" | "preco-asc" | "preco-desc" */
  ordenar?: string;
  limite?: number;
  apenasDestaques?: boolean;
};

export async function listarProdutos(f: FiltrosListagem = {}): Promise<ProdutoDaListagem[]> {
  const condicoes = [eq(products.active, true)];

  if (f.seccao) condicoes.push(eq(products.section, f.seccao));
  if (f.apenasDestaques) condicoes.push(eq(products.featured, true));

  if (f.tipo === "venda") {
    condicoes.push(inArray(products.offer, ["VENDA", "AMBOS"] as Offer[]));
  } else if (f.tipo === "aluguer") {
    condicoes.push(inArray(products.offer, ["ALUGUER", "AMBOS"] as Offer[]));
  }

  if (f.q) {
    const termo = `%${f.q}%`;
    condicoes.push(
      or(
        ilike(products.name, termo),
        ilike(products.description, termo),
        ilike(products.brand, termo)
      )!
    );
  }

  if (f.categoriaSlug) {
    condicoes.push(eq(categories.slug, f.categoriaSlug));
  }

  const ordem =
    f.ordenar === "preco-asc"
      ? asc(sql`COALESCE(${products.salePrice}, ${products.rentalDayPrice})`)
      : f.ordenar === "preco-desc"
        ? desc(sql`COALESCE(${products.salePrice}, ${products.rentalDayPrice})`)
        : desc(products.createdAt);

  const linhas = await db
    .select({
      p: products,
      categoriaNome: categories.name,
      categoriaSlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...condicoes))
    .orderBy(ordem)
    .limit(f.limite ?? 200);

  if (linhas.length === 0) return [];

  const ids = linhas.map((l) => l.p.id);

  const [imagens, variantes] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, ids))
      .orderBy(asc(productImages.position)),
    db
      .select()
      .from(productVariants)
      .where(and(inArray(productVariants.productId, ids), eq(productVariants.active, true))),
  ]);

  const estados = await estadoDasPecas(
    variantes.filter((v) => v.rentalStock > 0).map((v) => v.id)
  );

  return linhas.map(({ p, categoriaNome, categoriaSlug }) => {
    const minhasVariantes = variantes.filter((v) => v.productId === p.id);
    const imagem = imagens.find((i) => i.productId === p.id)?.url ?? null;

    const deAluguer = minhasVariantes.filter((v) => v.rentalStock > 0);
    const livres = deAluguer.filter((v) => estados.get(v.id)?.disponivel);
    const proximas = deAluguer
      .map((v) => estados.get(v.id)?.disponivelDe)
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      id: p.id,
      nome: p.name,
      slug: p.slug,
      seccao: p.section,
      categoria: { nome: categoriaNome, slug: categoriaSlug },
      oferta: p.offer,
      imagem,
      salePrice: p.salePrice,
      compareAtPrice: p.compareAtPrice,
      rentalDayPrice: p.rentalDayPrice,
      rentalDeposit: p.rentalDeposit,
      requiresFitting: p.requiresFitting,
      featured: p.featured,
      temStockVenda: minhasVariantes.some((v) => v.saleStock > 0),
      temAluguerLivre: livres.length > 0,
      aluguerDisponivelDe: livres.length > 0 ? null : (proximas[0] ?? null),
    };
  });
}

export async function getProduto(slug: string) {
  const [linha] = await db
    .select({ p: products, categoriaNome: categories.name, categoriaSlug: categories.slug })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(products.active, true)))
    .limit(1);

  if (!linha) return null;

  const [imagens, variantes] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, linha.p.id))
      .orderBy(asc(productImages.position)),
    db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, linha.p.id), eq(productVariants.active, true)))
      .orderBy(asc(productVariants.size)),
  ]);

  const estados = await estadoDasPecas(variantes.map((v) => v.id));

  const comEstado: VarianteComEstado[] = variantes.map((v) => ({
    id: v.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    saleStock: v.saleStock,
    rentalStock: v.rentalStock,
    aluguer:
      estados.get(v.id) ??
      ({
        disponivel: false,
        disponivelDe: new Date(),
        ocupadaAte: null,
        exemplares: 0,
      } as EstadoDaPeca),
  }));

  return {
    produto: linha.p,
    categoria: { nome: linha.categoriaNome, slug: linha.categoriaSlug },
    imagens,
    variantes: comEstado,
  };
}

export async function listarCategorias(seccao?: Section) {
  return db
    .select()
    .from(categories)
    .where(
      seccao
        ? and(eq(categories.active, true), eq(categories.section, seccao))
        : eq(categories.active, true)
    )
    .orderBy(asc(categories.position), asc(categories.name));
}

/** Peças que podem ser provadas no ateliê (para a página /marcacao) */
export async function listarProdutosParaProva() {
  const linhas = await db
    .select({
      id: products.id,
      nome: products.name,
      slug: products.slug,
      seccao: products.section,
      oferta: products.offer,
    })
    .from(products)
    .where(and(eq(products.active, true)))
    .orderBy(asc(products.section), asc(products.name));

  return linhas;
}
