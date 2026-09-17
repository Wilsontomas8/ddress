import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  appointments,
  orderEvents,
  orderItems,
  orders,
  payments,
  productImages,
  productVariants,
  products,
  rentalReservations,
  type ItemKind,
  type OrderStatus,
} from "@/db/schema";
import {
  ESTADOS_QUE_BLOQUEIAM,
  orcamentoAluguer,
  periodoEstaLivre,
} from "./availability";
import { addDays, formatDateTime, parseDay, toISODay } from "./dates";
import { limiteDaProva, momentoDaProva } from "./expiracao";
import { formatarCodigoMarcacao, horarioLivre, proximoNumeroMarcacao } from "./marcacoes";
import { getSettings } from "./settings";

// ---------------------------------------------------------------- schema

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");

export const esquemaItem = z.object({
  variantId: z.string().min(1),
  tipo: z.enum(["VENDA", "ALUGUER"]),
  quantidade: z.number().int().min(1).max(20).default(1),
  inicio: dataISO.optional(),
  fim: dataISO.optional(),
  /** Cliente fora de Luanda que pediu dispensa de prova */
  dispensaProva: z.boolean().optional(),
  prova: z
    .object({
      data: dataISO,
      hora: z.string().regex(/^\d{2}:\d{2}$/),
      fim: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .optional(),
});

export const esquemaPedido = z.object({
  cliente: z.object({
    nome: z.string().min(3, "Indique o nome completo."),
    telefone: z.string().min(9, "Indique um telefone válido."),
    email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
    morada: z.string().optional(),
  }),
  metodoPagamento: z.enum(["MULTICAIXA_EXPRESS", "TRANSFERENCIA", "NA_ENTREGA", "CARTAO"]),
  entrega: z.enum(["LEVANTAMENTO", "DOMICILIO"]).default("LEVANTAMENTO"),
  residencia: z.enum(["LUANDA", "FORA_LUANDA"]).default("LUANDA"),
  /** Declaração de responsabilidade, exigida para dispensar a prova */
  declaracaoAceite: z.boolean().optional(),
  referenciaPagamento: z.string().optional(),
  nota: z.string().max(1000).optional(),
  itens: z.array(esquemaItem).min(1, "O carrinho está vazio."),
  /** Serviços pedidos junto com a encomenda */
  extras: z
    .object({
      maquilhagem: z
        .object({
          parceiroId: z.string().min(1, "Escolha a maquilhadora."),
          data: z.string().regex(/^d{4}-d{2}-d{2}$/, "Indique o dia da maquilhagem."),
          hora: z.string().regex(/^d{2}:d{2}$/).optional().or(z.literal("")),
          local: z.string().max(200).optional(),
          notas: z.string().max(1000).optional(),
        })
        .optional(),
      sapatos: z
        .object({
          tamanho: z.string().max(20).optional(),
          notas: z.string().max(1000).optional(),
          produtos: z.array(z.string()).max(10).optional(),
        })
        .optional(),
    })
    .optional(),
});

export type DadosPedido = z.infer<typeof esquemaPedido>;

export class ErroDePedido extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// ------------------------------------------------------------- criação

/** DDR-2026-0001 */
async function proximoNumero(): Promise<string> {
  const ano = new Date().getFullYear();
  const linhas = await db.select({ number: orders.number }).from(orders);
  const numeros = linhas
    .map((l) => l.number)
    .filter((n) => n.startsWith(`DDR-${ano}-`))
    .map((n) => parseInt(n.split("-")[2] ?? "0", 10))
    .filter((n) => !Number.isNaN(n));
  const proximo = (numeros.length ? Math.max(...numeros) : 0) + 1;
  return `DDR-${ano}-${String(proximo).padStart(4, "0")}`;
}

type LinhaCalculada = {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  imageUrl: string | null;
  kind: ItemKind;
  quantity: number;
  unitPrice: number;
  deposit: number;
  lineTotal: number;
  startDate: Date | null;
  endDate: Date | null;
  days: number | null;
  cleaningBufferDays: number;
  exigeProva: boolean;
  dispensaProva: boolean;
  prova?: { data: string; hora: string; fim: string };
};

/**
 * Recalcula o pedido a partir da base de dados.
 * Os preços que vêm do navegador são ignorados de propósito.
 */
async function calcularLinhas(dados: DadosPedido): Promise<LinhaCalculada[]> {
  const variantIds = [...new Set(dados.itens.map((i) => i.variantId))];

  const linhas = await db
    .select({ v: productVariants, p: products })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(inArray(productVariants.id, variantIds));

  const imagens = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, linhas.map((l) => l.p.id)));

  const reservas = await db
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
    );

  const calculadas: LinhaCalculada[] = [];

  for (const item of dados.itens) {
    const linha = linhas.find((l) => l.v.id === item.variantId);
    if (!linha) throw new ErroDePedido("Uma das peças do carrinho já não existe.");

    const { v, p } = linha;
    if (!p.active || !v.active) {
      throw new ErroDePedido(`A peça "${p.name}" já não está disponível.`);
    }

    const imagem = imagens.find((i) => i.productId === p.id)?.url ?? null;
    const etiqueta = `Tamanho ${v.size} · ${v.color}`;

    // ------------------------------------------------------- venda
    if (item.tipo === "VENDA") {
      if (p.offer === "ALUGUER") {
        throw new ErroDePedido(`"${p.name}" é uma peça só de aluguer.`);
      }
      if (!p.salePrice) {
        throw new ErroDePedido(`"${p.name}" não tem preço de venda.`);
      }
      if (v.saleStock < item.quantidade) {
        throw new ErroDePedido(
          `Só restam ${v.saleStock} unidade(s) de "${p.name}" no tamanho ${v.size}.`
        );
      }

      calculadas.push({
        variantId: v.id,
        productId: p.id,
        productName: p.name,
        variantLabel: etiqueta,
        imageUrl: imagem,
        kind: "VENDA",
        quantity: item.quantidade,
        unitPrice: p.salePrice,
        deposit: 0,
        lineTotal: p.salePrice * item.quantidade,
        startDate: null,
        endDate: null,
        days: null,
        cleaningBufferDays: p.cleaningBufferDays,
        exigeProva: false,
        dispensaProva: false,
        prova: item.prova,
      });
      continue;
    }

    // ----------------------------------------------------- aluguer
    if (p.offer === "VENDA") {
      throw new ErroDePedido(`"${p.name}" não está disponível para aluguer.`);
    }
    if (!item.inicio || !item.fim) {
      throw new ErroDePedido(`Faltam as datas de aluguer de "${p.name}".`);
    }
    if (v.rentalStock < 1) {
      throw new ErroDePedido(`"${p.name}" (tamanho ${v.size}) não é alugável.`);
    }

    const inicio = parseDay(item.inicio);
    const fim = parseDay(item.fim);

    const minhasReservas = reservas
      .filter((r) => r.variantId === v.id)
      .map((r) => ({ startDate: r.startDate, blockUntil: r.blockUntil, status: r.status }));

    const livre = periodoEstaLivre(v.rentalStock, p.cleaningBufferDays, minhasReservas, inicio, fim);
    if (!livre.livre) {
      throw new ErroDePedido(`"${p.name}" (tamanho ${v.size}): ${livre.motivo}`, 409);
    }

    const orcamento = orcamentoAluguer(
      {
        rentalDayPrice: p.rentalDayPrice,
        rentalWeekendPrice: p.rentalWeekendPrice,
        rentalDeposit: p.rentalDeposit,
        minRentalDays: p.minRentalDays,
        maxRentalDays: p.maxRentalDays,
      },
      inicio,
      fim
    );
    if ("erro" in orcamento) {
      throw new ErroDePedido(`"${p.name}": ${orcamento.erro}`);
    }

    // Prova obrigatória em Luanda; fora de Luanda pode ser dispensada
    // mediante morada e declaração de responsabilidade.
    if (p.requiresFitting && !item.prova) {
      const podeDispensar =
        item.dispensaProva === true &&
        dados.residencia === "FORA_LUANDA" &&
        dados.declaracaoAceite === true &&
        (dados.cliente.morada ?? "").trim().length >= 8;

      if (!podeDispensar) {
        throw new ErroDePedido(
          `"${p.name}" exige prova no ateliê. Marque um horário, ou indique que reside fora de Luanda e aceite a declaração de responsabilidade.`
        );
      }
    }

    calculadas.push({
      variantId: v.id,
      productId: p.id,
      productName: p.name,
      variantLabel: etiqueta,
      imageUrl: imagem,
      kind: "ALUGUER",
      quantity: 1,
      unitPrice: orcamento.preco,
      deposit: orcamento.caucao,
      lineTotal: orcamento.preco,
      startDate: inicio,
      endDate: fim,
      days: orcamento.dias,
      cleaningBufferDays: p.cleaningBufferDays,
      exigeProva: p.requiresFitting && !item.dispensaProva,
      dispensaProva: item.dispensaProva === true,
      prova: item.prova,
    });
  }

  return calculadas;
}

export async function criarPedido(dados: DadosPedido, userId: string | null) {
  const linhas = await calcularLinhas(dados);
  const loja = await getSettings();

  // Os horários de prova ainda estão livres?
  for (const l of linhas) {
    if (!l.prova) continue;

    // Numa reserva de aluguer a prova tem de acontecer com a antecedência
    // mínima, senão a reserva expiraria logo (ver lib/expiracao.ts).
    if (l.kind === "ALUGUER" && l.exigeProva && l.startDate) {
      const limite = limiteDaProva(l.startDate, loja.reservationExpiryHours);
      if (momentoDaProva(parseDay(l.prova.data), l.prova.hora).getTime() > limite.getTime()) {
        throw new ErroDePedido(
          `A prova de "${l.productName}" tem de ser pelo menos ${loja.reservationExpiryHours} horas antes do levantamento. Escolha uma hora até ${formatDateTime(limite)}.`
        );
      }
    }

    const ok = await horarioLivre({
      variantId: l.variantId,
      data: parseDay(l.prova.data),
      hora: l.prova.hora,
    });
    if (!ok.livre) {
      throw new ErroDePedido(
        `A hora escolhida para provar "${l.productName}" acabou de ser ocupada: ${ok.motivo}`,
        409
      );
    }
  }

  const subtotal = linhas.reduce((t, l) => t + l.lineTotal, 0);
  const depositTotal = linhas.reduce((t, l) => t + l.deposit * l.quantity, 0);
  const deliveryFee = dados.entrega === "DOMICILIO" ? loja.deliveryFee : 0;
  const total = subtotal + depositTotal + deliveryFee;
  const precisaProva = linhas.some((l) => l.exigeProva);
  const provaDispensada =
    dados.residencia === "FORA_LUANDA" &&
    dados.declaracaoAceite === true &&
    linhas.some((l) => l.dispensaProva);

  const numero = await proximoNumero();
  const estadoInicial: OrderStatus = precisaProva ? "AGUARDA_PROVA" : "NOVO";

  // Numeramos as provas em sequência aqui fora: dentro da transação as
  // linhas ainda não estão visíveis para uma segunda consulta.
  let numeroProva = await proximoNumeroMarcacao();

  return db.transaction(async (tx) => {
    const [pedido] = await tx
      .insert(orders)
      .values({
        number: numero,
        userId,
        customerName: dados.cliente.nome,
        customerPhone: dados.cliente.telefone,
        customerEmail: dados.cliente.email || null,
        customerAddress: dados.cliente.morada || null,
        status: estadoInicial,
        paymentMethod: dados.metodoPagamento,
        paymentStatus: dados.referenciaPagamento ? "EM_VERIFICACAO" : "PENDENTE",
        subtotal,
        depositTotal,
        deliveryFee,
        total,
        needsFitting: precisaProva,
        customerResidence: dados.residencia,
        fittingWaived: provaDispensada,
        waiverAcceptedAt: provaDispensada ? new Date() : null,
        customerNote: dados.nota || null,
      })
      .returning();

    for (const l of linhas) {
      const [item] = await tx
        .insert(orderItems)
        .values({
          orderId: pedido.id,
          productId: l.productId,
          variantId: l.variantId,
          productName: l.productName,
          variantLabel: l.variantLabel,
          imageUrl: l.imageUrl,
          kind: l.kind,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          deposit: l.deposit,
          lineTotal: l.lineTotal,
          startDate: l.startDate,
          endDate: l.endDate,
          days: l.days,
        })
        .returning();

      // Aluguer: segura a peça no calendário
      if (l.kind === "ALUGUER" && l.startDate && l.endDate) {
        await tx.insert(rentalReservations).values({
          variantId: l.variantId,
          orderId: pedido.id,
          orderItemId: item.id,
          startDate: l.startDate,
          endDate: l.endDate,
          blockUntil: addDays(l.endDate, l.cleaningBufferDays),
          status: "PROVISORIA",
          note: `Reserva do pedido ${numero}.`,
        });
      }

      // Venda: baixa o stock
      if (l.kind === "VENDA") {
        await tx
          .update(productVariants)
          .set({ saleStock: sql`GREATEST(0, ${productVariants.saleStock} - ${l.quantity})` })
          .where(eq(productVariants.id, l.variantId));
      }

      // Prova no ateliê
      if (l.prova) {
        await tx.insert(appointments).values({
          code: formatarCodigoMarcacao(numeroProva++),
          userId,
          customerName: dados.cliente.nome,
          customerPhone: dados.cliente.telefone,
          customerEmail: dados.cliente.email || null,
          productId: l.productId,
          variantId: l.variantId,
          orderId: pedido.id,
          date: parseDay(l.prova.data),
          startTime: l.prova.hora,
          endTime: l.prova.fim,
          status: "PENDENTE",
          notes: `Prova de ${l.productName} (${l.variantLabel}).`,
        });
      }
    }

    if (dados.referenciaPagamento) {
      await tx.insert(payments).values({
        orderId: pedido.id,
        method: dados.metodoPagamento,
        amount: total,
        reference: dados.referenciaPagamento,
        status: "EM_VERIFICACAO",
      });
    }

    const eventos = [
      {
        orderId: pedido.id,
        type: "CRIADO",
        message: `Pedido criado no site com ${linhas.length} peça(s).`,
        actorId: userId,
      },
    ];
    if (precisaProva) {
      eventos.push({
        orderId: pedido.id,
        type: "PROVA",
        message: "O pedido tem peças que exigem prova no ateliê.",
        actorId: userId,
      });
    }
    if (provaDispensada) {
      eventos.push({
        orderId: pedido.id,
        type: "PROVA",
        message:
          "Prova dispensada: cliente declarou residir fora de Luanda e aceitou a declaração de responsabilidade.",
        actorId: userId,
      });
    }
    if (dados.referenciaPagamento) {
      eventos.push({
        orderId: pedido.id,
        type: "PAGAMENTO",
        message: `Cliente indicou a referência de pagamento: ${dados.referenciaPagamento}.`,
        actorId: userId,
      });
    }
    await tx.insert(orderEvents).values(eventos);

    return pedido;
  });
}

/** Resumo do pedido para mostrar ao cliente */
export async function getPedidoPorNumero(numero: string) {
  const [pedido] = await db.select().from(orders).where(eq(orders.number, numero)).limit(1);
  if (!pedido) return null;

  const [itens, marcacoes, pagamentos] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, pedido.id)),
    db.select().from(appointments).where(eq(appointments.orderId, pedido.id)),
    db.select().from(payments).where(eq(payments.orderId, pedido.id)),
  ]);

  return { pedido, itens, marcacoes, pagamentos };
}

export { toISODay };
