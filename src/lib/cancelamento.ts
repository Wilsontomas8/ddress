import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { db } from "@/db";
import { appointments, orderItems, productVariants, rentalReservations } from "@/db/schema";

export type Transacao = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Desfaz tudo o que um pedido segurava, dentro de uma transacção já
 * aberta: liberta as peças de aluguer, repõe o stock das peças vendidas
 * e cancela as provas por realizar.
 *
 * Usado ao cancelar no painel e quando uma reserva expira sem prova.
 */
export async function libertarPedidoNaTransacao(tx: Transacao, orderId: string) {
  await tx
    .update(rentalReservations)
    .set({ status: "CANCELADA", updatedAt: new Date() })
    .where(eq(rentalReservations.orderId, orderId));

  const itens = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const i of itens.filter((x) => x.kind === "VENDA")) {
    await tx
      .update(productVariants)
      .set({ saleStock: sql`${productVariants.saleStock} + ${i.quantity}` })
      .where(eq(productVariants.id, i.variantId));
  }

  await tx
    .update(appointments)
    .set({ status: "CANCELADA", updatedAt: new Date() })
    .where(
      and(
        eq(appointments.orderId, orderId),
        inArray(appointments.status, ["PENDENTE", "CONFIRMADA"])
      )
    );
}
