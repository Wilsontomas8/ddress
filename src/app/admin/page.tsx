import Link from "next/link";
import { and, count, desc, eq, gte, inArray, lte, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  orderItems,
  orders,
  productVariants,
  products,
  rentalReservations,
} from "@/db/schema";
import { formatKz } from "@/lib/money";
import { addDays, formatNumericDate, today } from "@/lib/dates";
import { ESTADO_MARCACAO, ESTADO_PEDIDO } from "@/lib/labels";
import { exigirAcesso } from "@/lib/guarda";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resumo" };

export default async function PainelResumo() {
  await exigirAcesso("resumo");

  const hoje = today();
  const inicioDoMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));

  const [
    [novos],
    [aguardaProva],
    [emAluguer],
    [vendasMes],
    provasDeHoje,
    pedidosPorTratar,
    devolucoes,
    pecasReservadas,
    emHigienizacao,
  ] = await Promise.all([
    db.select({ n: count() }).from(orders).where(eq(orders.status, "NOVO")),
    db.select({ n: count() }).from(orders).where(eq(orders.status, "AGUARDA_PROVA")),
    db.select({ n: count() }).from(orders).where(eq(orders.status, "EM_ALUGUER")),
    db
      .select({ total: sum(orders.total) })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, inicioDoMes),
          inArray(orders.status, ["PAGO", "PRONTO", "ENTREGUE", "EM_ALUGUER", "DEVOLVIDO", "CONCLUIDO"])
        )
      ),

    db
      .select({
        m: appointments,
        produto: products.name,
        tamanho: productVariants.size,
      })
      .from(appointments)
      .leftJoin(products, eq(appointments.productId, products.id))
      .leftJoin(productVariants, eq(appointments.variantId, productVariants.id))
      .where(
        and(
          eq(appointments.date, hoje),
          inArray(appointments.status, ["PENDENTE", "CONFIRMADA"])
        )
      )
      .orderBy(appointments.startTime),

    db
      .select()
      .from(orders)
      .where(inArray(orders.status, ["NOVO", "RECEBIDO", "AGUARDA_PROVA"]))
      .orderBy(desc(orders.createdAt))
      .limit(8),

    db
      .select({
        r: rentalReservations,
        produto: products.name,
        tamanho: productVariants.size,
        pedido: orders.number,
        cliente: orders.customerName,
      })
      .from(rentalReservations)
      .innerJoin(productVariants, eq(rentalReservations.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(orders, eq(rentalReservations.orderId, orders.id))
      .where(
        and(
          inArray(rentalReservations.status, ["ENTREGUE", "CONFIRMADA", "EM_HIGIENIZACAO"]),
          lte(rentalReservations.endDate, addDays(hoje, 3))
        )
      )
      .orderBy(rentalReservations.endDate)
      .limit(12),

    db
      .select({ n: count() })
      .from(rentalReservations)
      .where(
        and(
          inArray(rentalReservations.status, [
            "PROVISORIA",
            "CONFIRMADA",
            "ENTREGUE",
            "EM_HIGIENIZACAO",
          ]),
          gte(rentalReservations.blockUntil, hoje)
        )
      ),

    db
      .select({ n: count() })
      .from(rentalReservations)
      .where(eq(rentalReservations.status, "EM_HIGIENIZACAO")),
  ]);

  const cartoes = [
    { rotulo: "Pedidos novos", valor: novos?.n ?? 0, href: "/admin/pedidos?estado=NOVO" },
    {
      rotulo: "À espera de prova",
      valor: aguardaProva?.n ?? 0,
      href: "/admin/pedidos?estado=AGUARDA_PROVA",
    },
    { rotulo: "Peças fora (aluguer)", valor: emAluguer?.n ?? 0, href: "/admin/alugueres" },
    {
      rotulo: "Em higienização",
      valor: emHigienizacao[0]?.n ?? 0,
      href: "/admin/alugueres",
    },
    { rotulo: "Provas hoje", valor: provasDeHoje.length, href: "/admin/marcacoes" },
    {
      rotulo: "Peças reservadas",
      valor: pecasReservadas[0]?.n ?? 0,
      href: "/admin/alugueres",
    },
    {
      rotulo: "Faturado este mês",
      valor: formatKz(Number(vendasMes?.total ?? 0)),
      href: "/admin/pedidos",
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl">Resumo do dia</h1>
        <p className="mt-1 text-sm text-tinta-70">
          O que precisa de atenção agora: pedidos por receber, provas de hoje e peças a devolver.
        </p>
      </div>

      {/* ------------------------------------------------------ números */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cartoes.map((c) => (
          <Link key={c.rotulo} href={c.href} className="cartao p-4 transition-colors hover:border-marfim-400">
            <p className="text-[0.7rem] tracking-[0.06em] text-tinta-50 uppercase">{c.rotulo}</p>
            <p className="mt-2 font-display text-2xl">{c.valor}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ------------------------------------------------- por tratar */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Pedidos por tratar</h2>
            <Link href="/admin/pedidos" className="text-sm text-ouro-escuro hover:underline">
              Ver todos
            </Link>
          </div>

          {pedidosPorTratar.length === 0 ? (
            <p className="cartao mt-4 p-6 text-sm text-tinta-70">
              Nada por tratar. Bom trabalho.
            </p>
          ) : (
            <div className="cartao mt-4 overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosPorTratar.map((p) => {
                    const e = ESTADO_PEDIDO[p.status];
                    return (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/admin/pedidos/${p.id}`} className="text-ouro-escuro hover:underline">
                            {p.number}
                          </Link>
                          <span className="block text-xs text-tinta-50">
                            {formatNumericDate(p.createdAt)}
                          </span>
                        </td>
                        <td>
                          {p.customerName}
                          <span className="block text-xs text-tinta-50">{p.customerPhone}</span>
                        </td>
                        <td>
                          <span className={`selo ${e.cor}`}>{e.label}</span>
                        </td>
                        <td className="text-right whitespace-nowrap">{formatKz(p.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------------------------------------------- provas de hoje */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Provas de hoje</h2>
            <Link href="/admin/marcacoes" className="text-sm text-ouro-escuro hover:underline">
              Ver agenda
            </Link>
          </div>

          {provasDeHoje.length === 0 ? (
            <p className="cartao mt-4 p-6 text-sm text-tinta-70">Não há provas marcadas para hoje.</p>
          ) : (
            <ul className="cartao mt-4 divide-y divide-marfim-100">
              {provasDeHoje.map(({ m, produto, tamanho }) => {
                const e = ESTADO_MARCACAO[m.status];
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                    <span className="font-display text-lg">{m.startTime}</span>
                    <span>
                      {m.customerName}
                      <span className="block text-xs text-tinta-50">
                        {produto ?? "—"}
                        {tamanho ? ` · tamanho ${tamanho}` : ""} · {m.customerPhone}
                      </span>
                    </span>
                    <span className={`selo ml-auto ${e.cor}`}>{e.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ----------------------------------------------- devoluções */}
      <section>
        <h2 className="font-display text-xl">Devoluções previstas</h2>
        <p className="mt-1 text-sm text-tinta-70">
          Peças que voltam ao ateliê nos próximos dias — ou que já deviam ter voltado.
        </p>

        {devolucoes.length === 0 ? (
          <p className="cartao mt-4 p-6 text-sm text-tinta-70">Não há devoluções à vista.</p>
        ) : (
          <div className="cartao mt-4 overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Devolver até</th>
                  <th>Peça</th>
                  <th>Cliente</th>
                  <th>Pedido</th>
                  <th>Situação</th>
                  <th>Volta ao site</th>
                </tr>
              </thead>
              <tbody>
                {devolucoes.map(({ r, produto, tamanho, pedido, cliente }) => {
                  const emHigienizacao = r.status === "EM_HIGIENIZACAO";
                  const atrasada = !emHigienizacao && r.endDate.getTime() < hoje.getTime();
                  return (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">{formatNumericDate(r.endDate)}</td>
                      <td>
                        {produto}
                        <span className="block text-xs text-tinta-50">Tamanho {tamanho}</span>
                      </td>
                      <td>{cliente ?? "—"}</td>
                      <td>{pedido ?? <span className="text-tinta-50">bloqueio manual</span>}</td>
                      <td>
                        <span
                          className={`selo ${
                            emHigienizacao
                              ? "tom-azul"
                              : atrasada
                                ? "tom-rubi"
                                : "tom-ouro"
                          }`}
                        >
                          {emHigienizacao ? "Em higienização" : atrasada ? "Em atraso" : "A caminho"}
                        </span>
                      </td>
                      <td className="text-xs whitespace-nowrap">
                        {emHigienizacao ? (
                          <Link href="/admin/alugueres" className="text-ouro-escuro hover:underline">
                            {formatNumericDate(addDays(r.blockUntil, 1))}
                          </Link>
                        ) : (
                          <span className="text-tinta-50">
                            {formatNumericDate(addDays(r.blockUntil, 1))}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
