import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { partners, products, serviceRequestProducts, serviceRequests } from "@/db/schema";
import { avisarSolicitacaoCriada } from "./notificacoes";
import { parseDay } from "./dates";

export const esquemaSolicitacao = z.object({
  tipo: z.enum(["MAQUILHAGEM", "SAPATOS"]),
  parceiroId: z.string().optional().nullable(),
  pedidoId: z.string().optional().nullable(),
  nome: z.string().trim().min(3, "Indique o nome completo."),
  telefone: z.string().trim().min(9, "Indique um telefone válido."),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .optional()
    .or(z.literal("")),
  hora: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Hora inválida.")
    .optional()
    .or(z.literal("")),
  local: z.string().trim().max(200).optional(),
  tamanho: z.string().trim().max(20).optional(),
  notas: z.string().trim().max(1000).optional(),
  /** Sapatos escolhidos pela cliente */
  produtos: z.array(z.string()).max(10).optional(),
});

export type DadosSolicitacao = z.infer<typeof esquemaSolicitacao>;

export class ErroDeSolicitacao extends Error {}

async function proximoCodigo(): Promise<string> {
  const ano = new Date().getFullYear();
  const linhas = await db.select({ code: serviceRequests.code }).from(serviceRequests);
  const n =
    Math.max(
      0,
      ...linhas
        .map((l) => l.code)
        .filter((c) => c.startsWith(`SOL-${ano}-`))
        .map((c) => parseInt(c.split("-")[2] ?? "0", 10))
        .filter((x) => !Number.isNaN(x))
    ) + 1;
  return `SOL-${ano}-${String(n).padStart(4, "0")}`;
}

/** Cria a solicitação e avisa cliente, loja e parceira. Devolve o código. */
export async function criarSolicitacao(dados: DadosSolicitacao, userId: string | null) {
  if (dados.tipo === "MAQUILHAGEM") {
    if (!dados.parceiroId) throw new ErroDeSolicitacao("Escolha a maquilhadora.");
    const [p] = await db
      .select({ id: partners.id })
      .from(partners)
      .where(and(eq(partners.id, dados.parceiroId), eq(partners.active, true)));
    if (!p) throw new ErroDeSolicitacao("Esta parceira já não está disponível.");
    if (!dados.data) throw new ErroDeSolicitacao("Indique o dia do evento.");
  }

  const escolhidos = [...new Set(dados.produtos ?? [])];
  if (escolhidos.length) {
    const existentes = await db
      .select({ id: products.id })
      .from(products)
      .where(and(inArray(products.id, escolhidos), eq(products.active, true)));
    if (existentes.length !== escolhidos.length) throw new ErroDeSolicitacao("Um dos sapatos escolhidos já não existe.");
  }

  const codigo = await proximoCodigo();
  const [criada] = await db
    .insert(serviceRequests)
    .values({
      code: codigo,
      type: dados.tipo,
      partnerId: dados.tipo === "MAQUILHAGEM" ? dados.parceiroId : null,
      orderId: dados.pedidoId || null,
      userId,
      customerName: dados.nome,
      customerPhone: dados.telefone,
      customerEmail: dados.email || null,
      eventDate: dados.data ? parseDay(dados.data) : null,
      eventTime: dados.hora || null,
      location: dados.local || null,
      shoeSize: dados.tamanho || null,
      notes: dados.notas || null,
    })
    .returning();

  if (escolhidos.length) {
    await db.insert(serviceRequestProducts).values(escolhidos.map((productId) => ({ requestId: criada.id, productId, source: "CLIENTE" })));
  }

  await avisarSolicitacaoCriada(criada.id);
  return criada;
}
