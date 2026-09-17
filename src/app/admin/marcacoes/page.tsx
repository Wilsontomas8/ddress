import Link from "next/link";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { appointments, orders, productVariants, products } from "@/db/schema";
import AccoesMarcacao from "@/components/admin/AccoesMarcacao";
import { ESTADO_MARCACAO } from "@/lib/labels";
import {
  DIAS_SEMANA,
  MESES,
  addDays,
  formatNumericDate,
  parseDay,
  toISODay,
  today,
} from "@/lib/dates";
import { getConfigAtelie } from "@/lib/settings";
import { exigirAcesso } from "@/lib/guarda";

export const dynamic = "force-dynamic";
export const metadata = { title: "Provas" };

export default async function PaginaMarcacoes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirAcesso("provas");

  const sp = await searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const hoje = today();
  const desdeParam = um(sp.desde);
  const desde = desdeParam && /^\d{4}-\d{2}-\d{2}$/.test(desdeParam) ? parseDay(desdeParam) : hoje;
  const ate = addDays(desde, 13);

  const config = await getConfigAtelie();

  const linhas = await db
    .select({
      m: appointments,
      produto: products.name,
      tamanho: productVariants.size,
      cor: productVariants.color,
      pedidoId: orders.id,
      pedidoNumero: orders.number,
    })
    .from(appointments)
    .leftJoin(products, eq(appointments.productId, products.id))
    .leftJoin(productVariants, eq(appointments.variantId, productVariants.id))
    .leftJoin(orders, eq(appointments.orderId, orders.id))
    .where(and(gte(appointments.date, desde), lte(appointments.date, ate)))
    .orderBy(asc(appointments.date), asc(appointments.startTime));

  // agrupar por dia
  const porDia = new Map<string, typeof linhas>();
  for (const l of linhas) {
    const chave = toISODay(l.m.date);
    porDia.set(chave, [...(porDia.get(chave) ?? []), l]);
  }

  const dias: string[] = [];
  for (let d = new Date(desde); d.getTime() <= ate.getTime(); d = addDays(d, 1)) {
    dias.push(toISODay(d));
  }

  const ativas = linhas.filter((l) => ["PENDENTE", "CONFIRMADA"].includes(l.m.status));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Agenda de provas</h1>
          <p className="mt-1 text-sm text-tinta-70">
            {ativas.length} prova(s) por realizar nas próximas duas semanas · {config.slotCapacity}{" "}
            cabine(s) por horário
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/admin/marcacoes?desde=${toISODay(addDays(desde, -14))}`}
            className="btn btn-contorno px-3 py-1.5 text-xs"
          >
            ← Duas semanas antes
          </Link>
          <Link href="/admin/marcacoes" className="btn btn-contorno px-3 py-1.5 text-xs">
            Hoje
          </Link>
          <Link
            href={`/admin/marcacoes?desde=${toISODay(addDays(desde, 14))}`}
            className="btn btn-contorno px-3 py-1.5 text-xs"
          >
            Duas semanas depois →
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {dias.map((iso) => {
          const doDia = porDia.get(iso) ?? [];
          const data = parseDay(iso);
          const fechado =
            !config.openDays.includes(data.getUTCDay()) || config.closedDates.includes(iso);
          const ehHoje = iso === toISODay(hoje);

          if (doDia.length === 0 && fechado) return null;

          return (
            <section key={iso}>
              <h2
                className={`flex items-baseline gap-2 border-b pb-1.5 ${
                  ehHoje ? "border-ouro" : "border-marfim-200"
                }`}
              >
                <span className={`font-display text-lg ${ehHoje ? "text-ouro-escuro" : ""}`}>
                  {DIAS_SEMANA[data.getUTCDay()]}, {data.getUTCDate()} de{" "}
                  {MESES[data.getUTCMonth()]}
                </span>
                {ehHoje && <span className="text-xs text-ouro-escuro uppercase">hoje</span>}
                {fechado && <span className="text-xs text-tinta-50">ateliê encerrado</span>}
                <span className="ml-auto text-xs text-tinta-50">
                  {doDia.length} marcação(ões)
                </span>
              </h2>

              {doDia.length === 0 ? (
                <p className="py-3 text-sm text-tinta-50">Sem provas marcadas.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {doDia.map(({ m, produto, tamanho, cor, pedidoId, pedidoNumero }) => {
                    const e = ESTADO_MARCACAO[m.status];
                    return (
                      <li key={m.id} className="cartao p-4">
                        <div className="flex flex-wrap items-start gap-4">
                          <div className="w-20 shrink-0">
                            <p className="font-display text-xl">{m.startTime}</p>
                            <p className="text-xs text-tinta-50">até {m.endTime}</p>
                          </div>

                          <div className="min-w-56 flex-1">
                            <p className="font-medium">{m.customerName}</p>
                            <p className="text-sm text-tinta-70">
                              <a
                                href={`tel:${m.customerPhone}`}
                                className="text-ouro-escuro hover:underline"
                              >
                                {m.customerPhone}
                              </a>
                              {m.customerEmail ? ` · ${m.customerEmail}` : ""}
                            </p>
                            <p className="mt-1 text-sm">
                              {produto ?? "Peça não indicada"}
                              {tamanho ? ` · tamanho ${tamanho}` : ""}
                              {cor ? ` · ${cor}` : ""}
                            </p>
                            {m.notes && <p className="mt-1 text-xs text-tinta-50">{m.notes}</p>}
                            {m.staffNotes && (
                              <p className="mt-1 border-l-2 border-marfim-300 pl-2 text-xs">
                                {m.staffNotes}
                              </p>
                            )}
                            {pedidoId && (
                              <Link
                                href={`/admin/pedidos/${pedidoId}`}
                                className="mt-1 inline-block text-xs text-ouro-escuro hover:underline"
                              >
                                Pedido {pedidoNumero}
                              </Link>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span className={`selo ${e.cor}`}>{e.label}</span>
                            <span className="text-[0.65rem] text-tinta-50">{m.code}</span>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-marfim-100 pt-3">
                          <AccoesMarcacao
                            id={m.id}
                            estado={m.status}
                            staffNotes={m.staffNotes}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-10 text-xs text-tinta-50">
        Período mostrado: {formatNumericDate(desde)} a {formatNumericDate(ate)}.
      </p>
    </div>
  );
}
