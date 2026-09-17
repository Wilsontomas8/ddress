import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  orderEvents,
  orderItems,
  orders,
  payments,
  productVariants,
  products,
  rentalReservations,
  users,
} from "@/db/schema";
import FormularioHigienizacao from "@/components/admin/FormularioHigienizacao";
import { addDays, toISODay } from "@/lib/dates";
import { getUtilizador } from "@/lib/auth";
import AccoesPedido from "@/components/admin/AccoesPedido";
import { formatKz } from "@/lib/money";
import { formatDateTime, formatNumericDate } from "@/lib/dates";
import { exigirAcesso } from "@/lib/guarda";
import {
  ESTADO_MARCACAO,
  ESTADO_PAGAMENTO,
  ESTADO_PEDIDO,
  ESTADO_RESERVA,
  METODO_PAGAMENTO,
  PROXIMOS_ESTADOS,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p] = await db.select({ number: orders.number }).from(orders).where(eq(orders.id, id));
  return { title: p ? `Pedido ${p.number}` : "Pedido" };
}

export default async function PaginaPedidoAdmin({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirAcesso("pedidos");

  const { id } = await params;
  const eu = await getUtilizador();

  const [pedido] = await db.select().from(orders).where(eq(orders.id, id));
  if (!pedido) notFound();

  const [itens, pagamentos, eventos, marcacoes, reservas, responsavel] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(payments).where(eq(payments.orderId, id)).orderBy(desc(payments.createdAt)),
    db
      .select({ e: orderEvents, quem: users.name })
      .from(orderEvents)
      .leftJoin(users, eq(orderEvents.actorId, users.id))
      .where(eq(orderEvents.orderId, id))
      .orderBy(asc(orderEvents.createdAt)),
    db.select().from(appointments).where(eq(appointments.orderId, id)),
    db
      .select({
        r: rentalReservations,
        produto: products.name,
        tamanho: productVariants.size,
        cor: productVariants.color,
        diasHigienizacao: products.cleaningBufferDays,
      })
      .from(rentalReservations)
      .innerJoin(productVariants, eq(rentalReservations.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(eq(rentalReservations.orderId, id)),
    pedido.assignedToId
      ? db.select().from(users).where(eq(users.id, pedido.assignedToId))
      : Promise.resolve([]),
  ]);

  const estado = ESTADO_PEDIDO[pedido.status];
  const estadoPagamento = ESTADO_PAGAMENTO[pedido.paymentStatus];
  // Peças que já saíram e precisam (ou precisaram) de higienização
  const reservasParaHigienizar = reservas.filter((x) =>
    ["ENTREGUE", "EM_HIGIENIZACAO", "DEVOLVIDA"].includes(x.r.status)
  );

  const jaPago = pagamentos
    .filter((p) => p.status === "PAGO" && !p.isDepositRefund)
    .reduce((t, p) => t + p.amount, 0);

  return (
    <div>
      <nav className="text-xs text-tinta-50">
        <Link href="/admin/pedidos" className="hover:text-ouro-escuro">
          Pedidos
        </Link>
        <span className="mx-1.5">/</span>
        <span>{pedido.number}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">{pedido.number}</h1>
          <p className="mt-1 text-sm text-tinta-70">
            Criado a {formatDateTime(pedido.createdAt)} ·{" "}
            {responsavel[0] ? `com ${responsavel[0].name}` : "sem responsável"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`selo ${estado.cor}`}>{estado.label}</span>
          <span className={`selo ${estadoPagamento.cor}`}>{estadoPagamento.label}</span>
          {pedido.needsFitting && <span className="selo tom-violeta">Exige prova</span>}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]">
        {/* ------------------------------------------------ esquerda */}
        <div className="space-y-8">
          {/* cliente */}
          <section className="cartao p-5">
            <h2 className="font-display text-lg">Cliente</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-tinta-50">Nome</dt>
                <dd>{pedido.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs text-tinta-50">Telefone</dt>
                <dd>
                  <a href={`tel:${pedido.customerPhone}`} className="text-ouro-escuro hover:underline">
                    {pedido.customerPhone}
                  </a>
                  {" · "}
                  <a
                    href={`https://wa.me/${pedido.customerPhone.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ouro-escuro hover:underline"
                  >
                    WhatsApp
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-tinta-50">E-mail</dt>
                <dd>{pedido.customerEmail ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-tinta-50">Entrega</dt>
                <dd>{pedido.customerAddress ?? "Levantamento no ateliê"}</dd>
              </div>
            </dl>

            {pedido.customerNote && (
              <p className="mt-4 border-l-2 border-marfim-300 bg-marfim-50 px-3 py-2 text-sm">
                <span className="block text-xs text-tinta-50">Nota do cliente</span>
                {pedido.customerNote}
              </p>
            )}
            {pedido.staffNote && (
              <p className="mt-3 border-l-2 border-ouro bg-marfim-50 px-3 py-2 text-sm">
                <span className="block text-xs text-tinta-50">Nota interna</span>
                {pedido.staffNote}
              </p>
            )}
          </section>

          {/* peças */}
          <section className="cartao p-5">
            <h2 className="font-display text-lg">Peças</h2>
            <ul className="mt-4 space-y-4">
              {itens.map((i) => {
                const reserva = reservas.find((x) => x.r.orderItemId === i.id)?.r;
                return (
                  <li key={i.id} className="flex gap-4 border-b border-marfim-100 pb-4 last:border-0">
                    {i.imageUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={i.imageUrl}
                        alt={i.productName}
                        className="h-24 w-[4.5rem] bg-marfim-100 object-cover"
                      />
                    )}
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{i.productName}</p>
                      <p className="text-tinta-70">{i.variantLabel}</p>
                      <p className="mt-1 text-xs text-tinta-50">
                        {i.kind === "ALUGUER"
                          ? `Aluguer ${formatNumericDate(i.startDate)} → ${formatNumericDate(i.endDate)} (${i.days} dias)`
                          : `Venda · ${i.quantity} unidade(s)`}
                      </p>
                      {reserva && (
                        <p className="mt-1 text-xs">
                          Reserva: {ESTADO_RESERVA[reserva.status]}
                          {reserva.returnedAt && (
                            <> · voltou a {formatNumericDate(reserva.returnedAt)}</>
                          )}
                          {["PROVISORIA", "CONFIRMADA", "ENTREGUE", "EM_HIGIENIZACAO"].includes(
                            reserva.status
                          ) && (
                            <>
                              {" "}
                              · disponível a partir de{" "}
                              {formatNumericDate(addDays(reserva.blockUntil, 1))}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm whitespace-nowrap">
                      <p>{formatKz(i.lineTotal)}</p>
                      {i.deposit > 0 && (
                        <p className="text-xs text-tinta-50">caução {formatKz(i.deposit)}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <dl className="mt-5 space-y-1.5 border-t border-marfim-200 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-tinta-70">Peças</dt>
                <dd>{formatKz(pedido.subtotal)}</dd>
              </div>
              {pedido.depositTotal > 0 && (
                <div className="flex justify-between">
                  <dt className="text-tinta-70">Caução</dt>
                  <dd>{formatKz(pedido.depositTotal)}</dd>
                </div>
              )}
              {pedido.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <dt className="text-tinta-70">Entrega</dt>
                  <dd>{formatKz(pedido.deliveryFee)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-marfim-200 pt-2">
                <dt className="font-medium">Total</dt>
                <dd className="font-display text-lg">{formatKz(pedido.total)}</dd>
              </div>
              <div className="flex justify-between text-tinta-70">
                <dt>Já recebido</dt>
                <dd>{formatKz(jaPago)}</dd>
              </div>
            </dl>
          </section>

          {/* provas */}
          {marcacoes.length > 0 && (
            <section className="cartao p-5">
              <h2 className="font-display text-lg">Provas no ateliê</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {marcacoes.map((m) => {
                  const e = ESTADO_MARCACAO[m.status];
                  return (
                    <li key={m.id} className="flex flex-wrap items-center gap-3">
                      <span className="font-medium">
                        {formatNumericDate(m.date)} · {m.startTime}–{m.endTime}
                      </span>
                      <span className="text-tinta-70">{m.notes}</span>
                      <span className={`selo ml-auto ${e.cor}`}>{e.label}</span>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/admin/marcacoes"
                className="mt-3 inline-block text-sm text-ouro-escuro hover:underline"
              >
                Abrir agenda
              </Link>
            </section>
          )}

          {/* devolução e higienização */}
          {reservasParaHigienizar.length > 0 && (
            <section className="cartao p-5">
              <h2 className="font-display text-lg">Devolução e higienização</h2>
              <p className="mt-1 text-sm text-tinta-70">
                Registe o dia em que cada peça voltou e a partir de quando pode sair outra
                vez. Enquanto esse dia não chegar, a peça não aparece no site.
              </p>

              <div className="mt-5 space-y-6">
                {reservasParaHigienizar.map(
                  ({ r, produto, tamanho, cor, diasHigienizacao }) => (
                    <div key={r.id} className="border-t border-marfim-100 pt-5 first:border-0 first:pt-0">
                      <FormularioHigienizacao
                        dados={{
                          reservationId: r.id,
                          peca: `${produto} · ${tamanho} · ${cor}`,
                          status: r.status,
                          fimCombinado: toISODay(r.endDate),
                          devolvidaEm: r.returnedAt ? toISODay(r.returnedAt) : null,
                          disponivelEm: toISODay(addDays(r.blockUntil, 1)),
                          cleaningNote: r.cleaningNote,
                          diasHigienizacao,
                        }}
                      />
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {/* pagamentos */}
          <section className="cartao p-5">
            <h2 className="font-display text-lg">Pagamentos</h2>
            <p className="mt-1 text-sm text-tinta-70">
              Método escolhido pelo cliente: {METODO_PAGAMENTO[pedido.paymentMethod].label}
            </p>
            {pagamentos.length === 0 ? (
              <p className="mt-3 text-sm text-tinta-50">Ainda não há movimentos.</p>
            ) : (
              <table className="tabela mt-3">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>Referência</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">{formatNumericDate(p.createdAt)}</td>
                      <td className="whitespace-nowrap">
                        {p.isDepositRefund ? "− " : ""}
                        {formatKz(p.amount)}
                        {p.isDepositRefund && (
                          <span className="block text-xs text-tinta-50">caução devolvida</span>
                        )}
                      </td>
                      <td className="text-xs">{p.reference ?? "—"}</td>
                      <td>
                        <span className={`selo ${ESTADO_PAGAMENTO[p.status].cor}`}>
                          {ESTADO_PAGAMENTO[p.status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* histórico */}
          <section className="cartao p-5">
            <h2 className="font-display text-lg">Histórico</h2>
            <ol className="mt-4 space-y-3">
              {eventos.map(({ e, quem }) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-marfim-400" />
                  <span>
                    {e.message}
                    <span className="block text-xs text-tinta-50">
                      {formatDateTime(e.createdAt)}
                      {quem ? ` · ${quem}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* ------------------------------------------------- direita */}
        <div>
          <AccoesPedido
            pedido={{
              id: pedido.id,
              status: pedido.status,
              total: pedido.total,
              depositTotal: pedido.depositTotal,
              paymentMethod: pedido.paymentMethod,
              assignedToId: pedido.assignedToId,
              staffNote: pedido.staffNote,
            }}
            proximosEstados={PROXIMOS_ESTADOS[pedido.status]}
            porValidar={pagamentos
              .filter((p) => p.status === "EM_VERIFICACAO")
              .map((p) => ({ id: p.id, amount: p.amount, reference: p.reference }))}
            souEu={pedido.assignedToId === eu?.id}
            jaPago={jaPago}
          />
        </div>
      </div>
    </div>
  );
}
