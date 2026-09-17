import Link from "next/link";
import { and, count, desc, eq, gte, inArray, lte, ne } from "drizzle-orm";
import {
  ArrowUpRight,
  CalendarClock,
  ChartColumn,
  Hourglass,
  Plus,
  Repeat,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/db";
import {
  appointments,
  orderItems,
  orders,
  productVariants,
  products,
  rentalReservations,
  type OrderStatus,
} from "@/db/schema";
import GraficoArea from "@/components/admin/GraficoArea";
import { formatKz } from "@/lib/money";
import { MESES, addDays, formatDateTime, formatNumericDate, today } from "@/lib/dates";
import { ESTADO_MARCACAO, ESTADO_PEDIDO } from "@/lib/labels";
import { exigirAcesso } from "@/lib/guarda";
import { PERMISSOES } from "@/lib/permissoes";
import { avaliarReservasPendentes } from "@/lib/reservas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resumo" };

const ESTADOS_FATURADOS: OrderStatus[] = ["PAGO", "PRONTO", "ENTREGUE", "EM_ALUGUER", "DEVOLVIDO", "CONCLUIDO"];

/** Onde está o pedido no seu percurso, de 0 a 100 */
const PROGRESSO: Partial<Record<OrderStatus, number>> = {
  NOVO: 8,
  RECEBIDO: 20,
  AGUARDA_PROVA: 35,
  CONFIRMADO: 50,
  PAGO: 62,
  PRONTO: 75,
  ENTREGUE: 90,
  EM_ALUGUER: 85,
  DEVOLVIDO: 95,
  CONCLUIDO: 100,
};

function compacto(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-AO", { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000).toLocaleString("pt-AO")} mil`;
  return n.toLocaleString("pt-AO");
}

function variacao(actual: number, anterior: number): number | null {
  if (anterior === 0) return actual > 0 ? 100 : null;
  return ((actual - anterior) / anterior) * 100;
}

export default async function PainelResumo() {
  const eu = await exigirAcesso("resumo");
  const minhas = PERMISSOES[eu.role] ?? [];

  const hoje = today();
  const inicioDoMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
  const inicioMesAnterior = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1));
  const inicioSeisMeses = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 5, 1));

  const [
    pedidosSeisMeses,
    linhasSeisMeses,
    [pecasFora],
    [aDevolver],
    provasDeHoje,
    [provasPorConfirmar],
    pedidosPorTratar,
    devolucoes,
    emRisco,
  ] = await Promise.all([
    db
      .select({ criado: orders.createdAt, status: orders.status, subtotal: orders.subtotal, entrega: orders.deliveryFee })
      .from(orders)
      .where(and(gte(orders.createdAt, inicioSeisMeses), ne(orders.status, "CANCELADO"))),

    db
      .select({ criado: orders.createdAt, tipo: orderItems.kind, valor: orderItems.lineTotal })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(gte(orders.createdAt, inicioSeisMeses), inArray(orders.status, ESTADOS_FATURADOS))),

    db.select({ n: count() }).from(rentalReservations).where(eq(rentalReservations.status, "ENTREGUE")),

    db
      .select({ n: count() })
      .from(rentalReservations)
      .where(and(eq(rentalReservations.status, "ENTREGUE"), lte(rentalReservations.endDate, addDays(hoje, 3)))),

    db
      .select({ m: appointments, produto: products.name, tamanho: productVariants.size })
      .from(appointments)
      .leftJoin(products, eq(appointments.productId, products.id))
      .leftJoin(productVariants, eq(appointments.variantId, productVariants.id))
      .where(and(eq(appointments.date, hoje), inArray(appointments.status, ["PENDENTE", "CONFIRMADA"])))
      .orderBy(appointments.startTime),

    db
      .select({ n: count() })
      .from(appointments)
      .where(and(eq(appointments.status, "PENDENTE"), gte(appointments.date, hoje))),

    db
      .select()
      .from(orders)
      .where(inArray(orders.status, ["NOVO", "RECEBIDO", "AGUARDA_PROVA", "CONFIRMADO", "PAGO", "PRONTO"]))
      .orderBy(desc(orders.createdAt))
      .limit(6),

    db
      .select({
        r: rentalReservations,
        produto: products.name,
        tamanho: productVariants.size,
        pedido: orders.number,
        pedidoId: orders.id,
        cliente: orders.customerName,
      })
      .from(rentalReservations)
      .innerJoin(productVariants, eq(rentalReservations.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(orders, eq(rentalReservations.orderId, orders.id))
      .where(
        and(
          inArray(rentalReservations.status, ["ENTREGUE", "CONFIRMADA", "EM_HIGIENIZACAO"]),
          lte(rentalReservations.endDate, addDays(hoje, 5))
        )
      )
      .orderBy(rentalReservations.endDate)
      .limit(8),

    minhas.includes("pedidos") ? avaliarReservasPendentes() : Promise.resolve([]),
  ]);

  // ------------------------------------------------ números do mês
  const doMes = (inicio: Date, fim?: Date) =>
    pedidosSeisMeses.filter((p) => p.criado >= inicio && (!fim || p.criado < fim));
  const faturado = (lista: typeof pedidosSeisMeses) =>
    lista.filter((p) => ESTADOS_FATURADOS.includes(p.status)).reduce((t, p) => t + p.subtotal + p.entrega, 0);

  const esteMes = doMes(inicioDoMes);
  const mesAnterior = doMes(inicioMesAnterior, inicioDoMes);
  const faturadoMes = faturado(esteMes);
  const faturadoAnterior = faturado(mesAnterior);

  // ------------------------------------------------ série de 6 meses
  const meses = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 5 + i, 1)));
  const somaPorMes = (tipo: "VENDA" | "ALUGUER") =>
    meses.map((inicio, i) => {
      const fim = meses[i + 1] ?? new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 1));
      return linhasSeisMeses.filter((l) => l.tipo === tipo && l.criado >= inicio && l.criado < fim).reduce((t, l) => t + l.valor, 0);
    });
  const serieAluguer = somaPorMes("ALUGUER");
  const serieVenda = somaPorMes("VENDA");

  const cartoes: {
    rotulo: string;
    valor: string;
    icone: LucideIcon;
    delta?: number | null;
    nota: string;
    href: string;
  }[] = [
    {
      rotulo: "Faturado este mês",
      valor: formatKz(faturadoMes),
      icone: Wallet,
      delta: variacao(faturadoMes, faturadoAnterior),
      nota: `Até hoje · ${formatKz(faturadoAnterior)} no mês anterior`,
      href: minhas.includes("relatorios") ? "/admin/relatorios" : "/admin/pedidos",
    },
    {
      rotulo: "Pedidos este mês",
      valor: String(esteMes.length),
      icone: ShoppingBag,
      delta: variacao(esteMes.length, mesAnterior.length),
      nota: `Até hoje · ${mesAnterior.length} no mês anterior`,
      href: "/admin/pedidos?separador=todos",
    },
    {
      rotulo: "Peças fora",
      valor: String(pecasFora?.n ?? 0),
      icone: Repeat,
      nota: `${aDevolver?.n ?? 0} a devolver nos próximos 3 dias`,
      href: "/admin/alugueres",
    },
    {
      rotulo: "Provas hoje",
      valor: String(provasDeHoje.length),
      icone: CalendarClock,
      nota: `${provasPorConfirmar?.n ?? 0} marcação(ões) por confirmar`,
      href: "/admin/marcacoes",
    },
  ];

  const accoes = [
    { seccao: "produtos", href: "/admin/produtos/nova", titulo: "Nova peça", texto: "Preços de venda, aluguer, fim-de-semana e caução.", icone: Plus },
    { seccao: "provas", href: "/admin/marcacoes", titulo: "Agenda de provas", texto: "Confirmar, registar medidas e faltas.", icone: CalendarClock },
    { seccao: "alugueres", href: "/admin/alugueres", titulo: "Alugueres", texto: "Devoluções, higienização e bloqueios.", icone: Repeat },
    { seccao: "relatorios", href: "/admin/relatorios", titulo: "Relatório do mês", texto: "Vendas, alugueres e cauções, com exportação.", icone: ChartColumn },
  ].filter((a) => minhas.includes(a.seccao as (typeof minhas)[number]));

  const primeiroNome = eu.name.split(" ")[0];
  const agora = new Date();
  const saudacao = (() => {
    const h = Number(new Intl.DateTimeFormat("pt-PT", { hour: "numeric", hour12: false, timeZone: "Africa/Luanda" }).format(agora));
    return h < 12 ? "Bom dia" : h < 19 ? "Boa tarde" : "Boa noite";
  })();

  return (
    <div className="mx-auto max-w-[96rem] space-y-6">
      {/* ------------------------------------------------ boas-vindas */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">
            {saudacao}, <span className="texto-ouro italic">{primeiroNome}.</span>
          </h1>
          <p className="mt-2 text-sm text-tinta-70">
            {new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Luanda" }).format(agora)} · o que
            precisa de atenção na loja hoje.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {minhas.includes("pedidos") && (
            <Link href="/admin/pedidos" className="btn btn-escuro btn-sm">
              Fila de pedidos
            </Link>
          )}
          {minhas.includes("produtos") && (
            <Link href="/admin/produtos/nova" className="btn btn-principal btn-sm">
              <Plus className="h-4 w-4" strokeWidth={2} /> Nova peça
            </Link>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cartoes.map((c) => {
          const Icone = c.icone;
          const sobe = (c.delta ?? 0) >= 0;
          return (
            <Link key={c.rotulo} href={c.href} className="cartao group p-5 transition-colors hover:border-marfim-300">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-tinta-70">{c.rotulo}</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ouro/10 text-ouro-claro">
                  <Icone className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.6} />
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <p className="num font-display text-3xl leading-none">{c.valor}</p>
                {typeof c.delta === "number" && (
                  <span className={`selo selo-simples ${sobe ? "tom-verde" : "tom-rubi"}`}>
                    {sobe ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {sobe ? "+" : ""}
                    {c.delta.toLocaleString("pt-AO", { maximumFractionDigits: 1 })}%
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-tinta-50">{c.nota}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        {/* ------------------------------------------------ gráfico */}
        <section className="cartao p-5 sm:p-6" aria-labelledby="titulo-grafico">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="titulo-grafico" className="font-sans text-base font-semibold tracking-normal">
                Faturação por tipo
              </h2>
              <p className="mt-1 text-xs text-tinta-50">Últimos seis meses, sem cauções.</p>
            </div>
            <ul className="flex gap-4 text-xs text-tinta-70">
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-ouro-claro" /> Aluguer
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-azul" /> Venda
              </li>
            </ul>
          </div>
          <div className="mt-4 text-tinta">
            <GraficoArea
              titulo="Faturação de aluguer e venda nos últimos seis meses"
              rotulos={meses.map((m) => MESES[m.getUTCMonth()].slice(0, 3))}
              formatar={compacto}
              series={[
                { nome: "Aluguer", cor: "#e6c56a", valores: serieAluguer },
                { nome: "Venda", cor: "#7fb2e5", valores: serieVenda },
              ]}
            />
          </div>
        </section>

        {/* ------------------------------------------------ acções rápidas */}
        <section className="cartao p-5 sm:p-6" aria-labelledby="titulo-accoes">
          <h2 id="titulo-accoes" className="font-sans text-base font-semibold tracking-normal">
            Acções rápidas
          </h2>
          <p className="mt-1 text-xs text-tinta-50">Os atalhos do dia-a-dia do ateliê.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {accoes.map((a) => {
              const Icone = a.icone;
              return (
                <Link key={a.href} href={a.href} className="group rounded-xl border border-marfim-200 bg-marfim-100/50 p-4 transition-colors hover:border-ouro/40">
                  <div className="flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ouro/10 text-ouro-claro">
                      <Icone className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-tinta-50 transition-colors group-hover:text-ouro-claro" strokeWidth={1.6} />
                  </div>
                  <p className="mt-3 text-sm font-medium text-tinta">{a.titulo}</p>
                  <p className="mt-1 text-xs leading-relaxed text-tinta-50">{a.texto}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        {/* ------------------------------------------------ pedidos em curso */}
        <section className="cartao p-5 sm:p-6" aria-labelledby="titulo-pedidos">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 id="titulo-pedidos" className="font-sans text-base font-semibold tracking-normal">
                Pedidos em curso
              </h2>
              <p className="mt-1 text-xs text-tinta-50">Os mais recentes, e em que ponto do percurso estão.</p>
            </div>
            <Link href="/admin/pedidos" className="text-xs text-ouro-escuro hover:underline">
              Ver todos
            </Link>
          </div>

          {pedidosPorTratar.length === 0 ? (
            <p className="mt-6 text-sm text-tinta-70">Nada em curso. Bom trabalho.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {pedidosPorTratar.map((p) => {
                const e = ESTADO_PEDIDO[p.status];
                const progresso = PROGRESSO[p.status] ?? 0;
                return (
                  <li key={p.id}>
                    <Link
                      href={minhas.includes("pedidos") ? `/admin/pedidos/${p.id}` : "/admin"}
                      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-marfim-200 p-4 transition-colors hover:border-marfim-300 sm:flex-nowrap"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-marfim-100 text-ouro-claro">
                        <ShoppingBag className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.6} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="num text-sm font-medium text-tinta">{p.number}</span>
                          <span className={`selo ${e.cor}`}>{e.label}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-tinta-50">
                          {p.customerName} · {formatNumericDate(p.createdAt)} · {formatKz(p.total)}
                        </span>
                      </span>
                      <span className="w-full sm:w-44">
                        <span className="num mb-1.5 block text-right text-xs text-tinta-70">{progresso}%</span>
                        <span className="block h-1.5 overflow-hidden rounded-full bg-marfim-200">
                          <span
                            className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-ouro),var(--color-ouro-claro))]"
                            style={{ width: `${progresso}%` }}
                          />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ------------------------------------------------ atenção */}
        <div className="space-y-6">
          {minhas.includes("pedidos") && (
            <section className="cartao p-5 sm:p-6" aria-labelledby="titulo-expirar">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rubi/10 text-rubi">
                  <Hourglass className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.6} />
                </span>
                <div>
                  <h2 id="titulo-expirar" className="font-sans text-base font-semibold tracking-normal">
                    Reservas sem prova
                  </h2>
                  <p className="mt-1 text-xs text-tinta-50">Expiram se não houver prova marcada até ao limite.</p>
                </div>
              </div>
              {emRisco.length === 0 ? (
                <p className="mt-5 text-sm text-tinta-70">Todas as reservas têm prova marcada.</p>
              ) : (
                <ul className="mt-4 divide-y divide-marfim-200">
                  {emRisco.slice(0, 5).map((r) => (
                    <li key={r.orderId} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="min-w-0">
                        <Link href={`/admin/pedidos/${r.orderId}`} className="num font-medium text-tinta hover:underline">
                          {r.numero}
                        </Link>
                        <span className="block truncate text-xs text-tinta-50">
                          {r.cliente} · {r.telefone}
                        </span>
                      </span>
                      <span className={`selo selo-simples shrink-0 ${r.avaliacao.horasRestantes < 24 ? "tom-rubi" : "tom-ouro"}`} title={`Limite: ${formatDateTime(r.avaliacao.limite)}`}>
                        {r.avaliacao.horasRestantes < 48
                          ? `${Math.max(0, Math.floor(r.avaliacao.horasRestantes))} h`
                          : `${Math.floor(r.avaliacao.horasRestantes / 24)} dias`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="cartao p-5 sm:p-6" aria-labelledby="titulo-provas">
            <div className="flex items-center justify-between gap-4">
              <h2 id="titulo-provas" className="font-sans text-base font-semibold tracking-normal">
                Provas de hoje
              </h2>
              {minhas.includes("provas") && (
                <Link href="/admin/marcacoes" className="text-xs text-ouro-escuro hover:underline">
                  Agenda
                </Link>
              )}
            </div>
            {provasDeHoje.length === 0 ? (
              <p className="mt-5 text-sm text-tinta-70">Não há provas marcadas para hoje.</p>
            ) : (
              <ul className="mt-4 divide-y divide-marfim-200">
                {provasDeHoje.map(({ m, produto, tamanho }) => {
                  const e = ESTADO_MARCACAO[m.status];
                  return (
                    <li key={m.id} className="flex items-center gap-3 py-3 text-sm">
                      <span className="num w-12 shrink-0 font-display text-lg text-ouro-claro">{m.startTime}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-tinta">{m.customerName}</span>
                        <span className="block truncate text-xs text-tinta-50">
                          {produto ?? "—"}
                          {tamanho ? ` · tamanho ${tamanho}` : ""}
                        </span>
                      </span>
                      <span className={`selo ${e.cor}`}>{e.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* ------------------------------------------------ devoluções */}
      <section className="cartao overflow-hidden" aria-labelledby="titulo-devolucoes">
        <div className="p-5 sm:p-6">
          <h2 id="titulo-devolucoes" className="font-sans text-base font-semibold tracking-normal">
            Devoluções previstas
          </h2>
          <p className="mt-1 text-xs text-tinta-50">Peças que voltam ao ateliê nos próximos dias — ou que já deviam ter voltado.</p>
        </div>

        {devolucoes.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-tinta-70">Não há devoluções à vista.</p>
        ) : (
          <div className="overflow-x-auto border-t border-marfim-200">
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
                {devolucoes.map(({ r, produto, tamanho, pedido, pedidoId, cliente }) => {
                  const emHigienizacao = r.status === "EM_HIGIENIZACAO";
                  const atrasada = !emHigienizacao && r.endDate.getTime() < hoje.getTime();
                  return (
                    <tr key={r.id}>
                      <td className="num whitespace-nowrap">{formatNumericDate(r.endDate)}</td>
                      <td>
                        {produto}
                        <span className="block text-xs text-tinta-50">Tamanho {tamanho}</span>
                      </td>
                      <td>{cliente ?? "—"}</td>
                      <td className="num">
                        {pedido && pedidoId ? (
                          <Link href={`/admin/pedidos/${pedidoId}`} className="text-ouro-escuro hover:underline">
                            {pedido}
                          </Link>
                        ) : (
                          <span className="text-tinta-50">bloqueio manual</span>
                        )}
                      </td>
                      <td>
                        <span className={`selo ${emHigienizacao ? "tom-azul" : atrasada ? "tom-rubi" : "tom-ouro"}`}>
                          {emHigienizacao ? "Em higienização" : atrasada ? "Em atraso" : "A caminho"}
                        </span>
                      </td>
                      <td className="num text-xs whitespace-nowrap text-tinta-70">{formatNumericDate(addDays(r.blockUntil, 1))}</td>
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
