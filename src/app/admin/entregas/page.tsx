import Link from "next/link";
import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { exigirAcesso } from "@/lib/guarda";
import AccoesEntrega from "@/components/admin/AccoesEntrega";
import { addDays, formatNumericDate, today } from "@/lib/dates";
import { podeVerNa } from "@/lib/permissoes";
import { formatKz } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entregas e recolhas" };

export default async function PaginaEntregas() {
  const eu = await exigirAcesso("entregas");
  const hoje = today();

  // O motorista não vê valores: só o que precisa para entregar e recolher.
  const veValores = podeVerNa(eu.matriz, "pedidos");

  const [paraEntregar, paraRecolher] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(and(eq(orders.status, "PRONTO")))
      .orderBy(asc(orders.updatedAt)),

    db
      .select({
        pedido: orders,
        fim: orderItems.endDate,
        peca: orderItems.productName,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.status, "EM_ALUGUER"),
          inArray(orderItems.kind, ["ALUGUER"]),
          isNotNull(orderItems.endDate),
          lte(orderItems.endDate, addDays(hoje, 2))
        )
      )
      .orderBy(asc(orderItems.endDate)),
  ]);

  // Um pedido pode ter várias peças: agrupamos para não repetir a tarefa.
  const recolhas = new Map<
    string,
    { pedido: typeof orders.$inferSelect; fim: Date | null; pecas: string[] }
  >();
  for (const linha of paraRecolher) {
    const atual = recolhas.get(linha.pedido.id);
    if (atual) {
      atual.pecas.push(linha.peca);
      if (linha.fim && (!atual.fim || linha.fim < atual.fim)) atual.fim = linha.fim;
    } else {
      recolhas.set(linha.pedido.id, {
        pedido: linha.pedido,
        fim: linha.fim,
        pecas: [linha.peca],
      });
    }
  }

  const tarefasDeRecolha = [...recolhas.values()];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl">Entregas e recolhas</h1>
        <p className="mt-1 text-sm text-tinta-70">
          {paraEntregar.length} entrega(s) por fazer · {tarefasDeRecolha.length} recolha(s)
          nos próximos dias.
        </p>
      </div>

      {/* ------------------------------------------------- entregas */}
      <section>
        <h2 className="font-display text-xl">Para entregar</h2>
        {paraEntregar.length === 0 ? (
          <p className="cartao mt-4 p-6 text-sm text-tinta-70">
            Não há entregas por fazer neste momento.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 lg:grid-cols-2">
            {paraEntregar.map((p) => (
              <li key={p.id} className="cartao p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{p.customerName}</p>
                    <p className="text-sm">
                      <a href={`tel:${p.customerPhone}`} className="text-ouro-escuro hover:underline">
                        {p.customerPhone}
                      </a>
                      {" · "}
                      <a
                        href={`https://wa.me/${p.customerPhone.replace(/[^\d]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ouro-escuro hover:underline"
                      >
                        WhatsApp
                      </a>
                    </p>
                  </div>
                  <span className="selo tom-neutro">{p.number}</span>
                </div>

                <p className="mt-3 text-sm text-tinta-70">
                  {p.customerAddress ? (
                    <>
                      <span className="block text-xs text-tinta-50">Morada</span>
                      {p.customerAddress}
                    </>
                  ) : (
                    <span className="text-tinta-50">Levantamento no ateliê</span>
                  )}
                </p>

                {veValores && p.paymentStatus !== "PAGO" && (
                  <p className="mt-3 border-l-2 border-ouro bg-marfim-100 px-3 py-2 text-sm">
                    Cobrar na entrega: {formatKz(p.total)}
                  </p>
                )}

                <div className="mt-4 border-t border-marfim-100 pt-3">
                  <AccoesEntrega orderId={p.id} tipo="ENTREGA" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------- recolhas */}
      <section>
        <h2 className="font-display text-xl">Para recolher</h2>
        {tarefasDeRecolha.length === 0 ? (
          <p className="cartao mt-4 p-6 text-sm text-tinta-70">
            Não há recolhas nos próximos dias.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 lg:grid-cols-2">
            {tarefasDeRecolha.map(({ pedido, fim, pecas }) => {
              const atrasada = !!fim && fim.getTime() < hoje.getTime();
              return (
                <li key={pedido.id} className="cartao p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{pedido.customerName}</p>
                      <p className="text-sm">
                        <a
                          href={`tel:${pedido.customerPhone}`}
                          className="text-ouro-escuro hover:underline"
                        >
                          {pedido.customerPhone}
                        </a>
                      </p>
                    </div>
                    <span
                      className={`selo ${
                        atrasada ? "tom-rubi" : "tom-neutro"
                      }`}
                    >
                      {atrasada ? "Em atraso" : "A recolher"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm">
                    <span className="block text-xs text-tinta-50">Devolução combinada</span>
                    {formatNumericDate(fim)}
                  </p>
                  <p className="mt-2 text-sm text-tinta-70">{pecas.join(", ")}</p>
                  {pedido.customerAddress && (
                    <p className="mt-2 text-sm text-tinta-70">{pedido.customerAddress}</p>
                  )}

                  <div className="mt-4 border-t border-marfim-100 pt-3">
                    <AccoesEntrega orderId={pedido.id} tipo="RECOLHA" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {veValores && (
        <p className="text-xs text-tinta-50">
          As entregas aparecem quando o pedido passa a “Pronto para entrega” em{" "}
          <Link href="/admin/pedidos" className="text-ouro-escuro hover:underline">
            Pedidos
          </Link>
          .
        </p>
      )}
    </div>
  );
}
