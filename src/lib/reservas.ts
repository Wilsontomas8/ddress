import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { appointments, orderEvents, orders, rentalReservations } from "@/db/schema";
import { libertarPedidoNaTransacao } from "./cancelamento";
import { ESTADOS_DE_PEDIDO_QUE_EXPIRAM, avaliarReserva, type AvaliacaoDaReserva } from "./expiracao";
import { formatDateTime } from "./dates";
import { getSettings } from "./settings";

export type PedidoEmRisco = {
  orderId: string;
  numero: string;
  cliente: string;
  telefone: string;
  avaliacao: AvaliacaoDaReserva;
};

/**
 * Pedidos com reserva de aluguer sujeitos à regra de expiração, já
 * avaliados. Serve o painel (reservas a expirar) e a própria expiração.
 */
export async function avaliarReservasPendentes(agora = new Date()): Promise<PedidoEmRisco[]> {
  const loja = await getSettings();

  const pedidos = await db
    .select({
      id: orders.id,
      numero: orders.number,
      cliente: orders.customerName,
      telefone: orders.customerPhone,
      estado: orders.status,
      exigeProva: orders.needsFitting,
      dispensada: orders.fittingWaived,
    })
    .from(orders)
    .where(and(inArray(orders.status, ESTADOS_DE_PEDIDO_QUE_EXPIRAM), eq(orders.needsFitting, true), eq(orders.fittingWaived, false)));

  if (pedidos.length === 0) return [];
  const ids = pedidos.map((p) => p.id);

  const [reservas, provas] = await Promise.all([
    db
      .select({ orderId: rentalReservations.orderId, inicio: rentalReservations.startDate })
      .from(rentalReservations)
      .where(and(inArray(rentalReservations.orderId, ids), eq(rentalReservations.status, "PROVISORIA"))),
    db
      .select({ orderId: appointments.orderId, data: appointments.date, hora: appointments.startTime, status: appointments.status })
      .from(appointments)
      .where(inArray(appointments.orderId, ids)),
  ]);

  const resultado: PedidoEmRisco[] = [];
  for (const p of pedidos) {
    const inicios = reservas.filter((r) => r.orderId === p.id).map((r) => r.inicio.getTime());
    if (inicios.length === 0) continue;

    const avaliacao = avaliarReserva(
      {
        estadoDoPedido: p.estado,
        exigeProva: p.exigeProva,
        provaDispensada: p.dispensada,
        levantamento: new Date(Math.min(...inicios)),
        provas: provas
          .filter((x) => x.orderId === p.id)
          .map((x) => ({ data: x.data, hora: x.hora, status: x.status })),
      },
      agora,
      loja.reservationExpiryHours
    );

    if (avaliacao.sujeita && !avaliacao.temProvaValida) {
      resultado.push({ orderId: p.id, numero: p.numero, cliente: p.cliente, telefone: p.telefone, avaliacao });
    }
  }

  return resultado.sort((a, b) => a.avaliacao.limite.getTime() - b.avaliacao.limite.getTime());
}

/**
 * Cancela os pedidos cuja reserva expirou sem prova e liberta as peças.
 * Idempotente: pode correr a qualquer momento (painel, tarefa agendada).
 */
export async function expirarReservasSemProva(agora = new Date()): Promise<string[]> {
  const loja = await getSettings();
  const expiradas = (await avaliarReservasPendentes(agora)).filter((p) => p.avaliacao.expirada);

  for (const p of expiradas) {
    await db.transaction(async (tx) => {
      // Volta a confirmar dentro da transacção: outra pessoa pode ter
      // tratado o pedido entretanto.
      const [actual] = await tx.select({ status: orders.status }).from(orders).where(eq(orders.id, p.orderId));
      if (!actual || !ESTADOS_DE_PEDIDO_QUE_EXPIRAM.includes(actual.status)) return;

      await tx.update(orders).set({ status: "CANCELADO", updatedAt: new Date() }).where(eq(orders.id, p.orderId));
      await libertarPedidoNaTransacao(tx, p.orderId);
      await tx.insert(orderEvents).values({
        orderId: p.orderId,
        type: "EXPIRADO",
        message: `Reserva expirada: não havia prova marcada até ${formatDateTime(p.avaliacao.limite)} (${loja.reservationExpiryHours} horas antes do levantamento). As peças voltaram a ficar disponíveis.`,
        actorId: null,
      });
    });
  }

  return expiradas.map((p) => p.numero);
}

const global = globalThis as unknown as { __ddressUltimaExpiracao?: number };

/**
 * Corre a expiração no máximo uma vez por minuto por processo. Chamado
 * nas páginas que mostram disponibilidade, para que uma peça libertada
 * apareça logo, mesmo sem tarefa agendada.
 */
export async function expirarSeNecessario() {
  const agora = Date.now();
  if (global.__ddressUltimaExpiracao && agora - global.__ddressUltimaExpiracao < 60_000) return;
  global.__ddressUltimaExpiracao = agora;
  try {
    await expirarReservasSemProva(new Date(agora));
  } catch (e) {
    console.error("[DDRESS] Falhou a expiração de reservas:", e);
  }
}
