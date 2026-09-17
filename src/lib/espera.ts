import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { availabilityAlerts, newsletterSubscribers, productVariants, products } from "@/db/schema";
import { estadoDasPecas } from "./catalogo";
import { enviarEmail } from "./email";
import { toISODay } from "./dates";

/**
 * Duas listas que dependem do tempo, não de uma acção da equipa:
 *
 *  · avisos de disponibilidade — a cliente pede para ser avisada quando a
 *    peça voltar do aluguer; a tarefa diária verifica e avisa uma vez;
 *  · newsletter — inscrição com consentimento e saída num clique.
 */

function urlDoSite(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");
}

// =====================================================================
//  AVISOS DE DISPONIBILIDADE
// =====================================================================

export const esquemaDeEspera = z.object({
  produtoId: z.string().min(1, "Peça desconhecida."),
  varianteId: z.string().optional().nullable(),
  nome: z.string().trim().min(3, "Escreva o seu nome."),
  telefone: z.string().trim().min(9, "Escreva um telefone de contacto."),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").optional().or(z.literal("")),
});

export type PedidoDeEspera = z.infer<typeof esquemaDeEspera>;

export async function pedirAvisoDeDisponibilidade(dados: PedidoDeEspera, userId: string | null) {
  const d = esquemaDeEspera.parse(dados);

  const [peca] = await db.select({ id: products.id, name: products.name }).from(products).where(eq(products.id, d.produtoId));
  if (!peca) throw new Error("Peça desconhecida.");

  // Um pedido por pessoa e peça enquanto o anterior não foi avisado
  const [repetido] = await db
    .select({ id: availabilityAlerts.id })
    .from(availabilityAlerts)
    .where(
      and(
        eq(availabilityAlerts.productId, d.produtoId),
        eq(availabilityAlerts.customerPhone, d.telefone),
        isNull(availabilityAlerts.notifiedAt)
      )
    );
  if (repetido) return { ok: true as const, peca: peca.name, repetido: true };

  await db.insert(availabilityAlerts).values({
    productId: d.produtoId,
    variantId: d.varianteId || null,
    userId,
    customerName: d.nome,
    customerPhone: d.telefone,
    customerEmail: d.email || null,
    wantedFrom: d.desde ? new Date(`${d.desde}T00:00:00Z`) : null,
  });

  return { ok: true as const, peca: peca.name, repetido: false };
}

/**
 * Tarefa diária: para cada pedido ainda não avisado, vê se a peça já está
 * livre (ou livre até ao dia pedido) e avisa a cliente uma única vez.
 */
export async function avisarQuemEsperava(): Promise<{ avisados: number; semEmail: number }> {
  const pendentes = await db
    .select({
      a: availabilityAlerts,
      peca: products.name,
      slug: products.slug,
    })
    .from(availabilityAlerts)
    .innerJoin(products, eq(availabilityAlerts.productId, products.id))
    .where(and(isNull(availabilityAlerts.notifiedAt), eq(products.active, true)))
    .orderBy(asc(availabilityAlerts.createdAt))
    .limit(200);

  if (pendentes.length === 0) return { avisados: 0, semEmail: 0 };

  // Tamanhos de cada peça em causa
  const variantes = await db
    .select({ id: productVariants.id, productId: productVariants.productId })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.active, true),
        sql`${productVariants.productId} IN (${sql.join(
          [...new Set(pendentes.map((p) => p.a.productId))].map((id) => sql`${id}`),
          sql`, `
        )})`
      )
    );
  const estados = await estadoDasPecas(variantes.map((v) => v.id));

  let avisados = 0;
  let semEmail = 0;

  for (const { a, peca, slug } of pendentes) {
    const minhas = a.variantId
      ? variantes.filter((v) => v.id === a.variantId)
      : variantes.filter((v) => v.productId === a.productId);

    const livre = minhas.some((v) => {
      const e = estados.get(v.id);
      if (!e) return false;
      if (e.disponivel) return true;
      return !!a.wantedFrom && e.disponivelDe.getTime() <= a.wantedFrom.getTime();
    });
    if (!livre) continue;

    const ligacao = `${urlDoSite()}/produto/${slug}`;
    if (a.customerEmail) {
      const envio = await enviarEmail({
        para: a.customerEmail,
        assunto: `DDRESS — ${peca} já está livre`,
        texto: `Olá, ${a.customerName.split(" ")[0]}.\n\nA peça "${peca}" que estava à espera já está disponível${
          a.wantedFrom ? ` para ${toISODay(a.wantedFrom)}` : ""
        }.\n\nReserve pelo site ou fale connosco pelo WhatsApp — as peças mais procuradas saem depressa.`,
        ligacao,
      });
      if (!envio.ok) semEmail++;
    } else {
      semEmail++;
    }

    await db.update(availabilityAlerts).set({ notifiedAt: new Date() }).where(eq(availabilityAlerts.id, a.id));
    avisados++;
  }

  return { avisados, semEmail };
}

/** Pedidos de aviso por tratar — para o painel */
export async function esperasPorTratar(limite = 100) {
  return db
    .select({
      id: availabilityAlerts.id,
      nome: availabilityAlerts.customerName,
      telefone: availabilityAlerts.customerPhone,
      email: availabilityAlerts.customerEmail,
      desde: availabilityAlerts.wantedFrom,
      criadoEm: availabilityAlerts.createdAt,
      avisadoEm: availabilityAlerts.notifiedAt,
      peca: products.name,
      slug: products.slug,
    })
    .from(availabilityAlerts)
    .innerJoin(products, eq(availabilityAlerts.productId, products.id))
    .orderBy(asc(availabilityAlerts.notifiedAt), asc(availabilityAlerts.createdAt))
    .limit(limite);
}

// =====================================================================
//  NEWSLETTER
// =====================================================================

export const esquemaNewsletter = z.object({
  email: z.string().trim().email("E-mail inválido."),
  nome: z.string().trim().max(120).optional().or(z.literal("")),
  origem: z.string().trim().max(20).optional().or(z.literal("")),
  consentimento: z.boolean().refine((v) => v === true, "Precisamos da sua autorização para lhe escrever."),
});

export async function inscreverNaNewsletter(dados: unknown) {
  const d = esquemaNewsletter.parse(dados);
  const email = d.email.toLowerCase();
  const token = randomBytes(16).toString("hex");

  const [ja] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
  if (ja) {
    // Voltar a inscrever-se depois de sair é um novo consentimento
    if (ja.unsubscribedAt) {
      await db
        .update(newsletterSubscribers)
        .set({ unsubscribedAt: null, consentAt: new Date(), name: d.nome || ja.name })
        .where(eq(newsletterSubscribers.id, ja.id));
    }
    return { ok: true as const, token: ja.token, jaEstava: !ja.unsubscribedAt };
  }

  await db.insert(newsletterSubscribers).values({
    email,
    name: d.nome || "",
    source: d.origem || "site",
    token,
  });

  await enviarEmail({
    para: email,
    assunto: "DDRESS — está na nossa lista",
    texto: `Obrigada por se juntar à DDRESS.\n\nVai receber novidades das colecções e das peças que chegam ao ateliê. Pode sair quando quiser, pela ligação abaixo.`,
    ligacao: `${urlDoSite()}/newsletter/sair/${token}`,
  });

  return { ok: true as const, token, jaEstava: false };
}

export async function sairDaNewsletter(token: string): Promise<{ ok: boolean; email?: string }> {
  const [inscrito] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.token, token));
  if (!inscrito) return { ok: false };
  if (!inscrito.unsubscribedAt) {
    await db.update(newsletterSubscribers).set({ unsubscribedAt: new Date() }).where(eq(newsletterSubscribers.id, inscrito.id));
  }
  return { ok: true, email: inscrito.email };
}

export async function listarNewsletter(limite = 500) {
  return db.select().from(newsletterSubscribers).orderBy(asc(newsletterSubscribers.consentAt)).limit(limite);
}
