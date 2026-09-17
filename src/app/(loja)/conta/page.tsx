import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { appointments, orderItems, orders } from "@/db/schema";
import { getUtilizador } from "@/lib/auth";
import BotaoSair from "@/components/BotaoSair";
import { formatKz } from "@/lib/money";
import { formatNumericDate } from "@/lib/dates";
import { ESTADO_MARCACAO, ESTADO_PAGAMENTO, ESTADO_PEDIDO } from "@/lib/labels";
import { serviceRequests } from "@/db/schema";
import { avisosDoCliente } from "@/lib/notificacoes";
import { formatDateTime } from "@/lib/dates";
import { ESTADO_SOLICITACAO, ROTULO_SOLICITACAO, type EstadoDeSolicitacao, type TipoDeSolicitacao } from "@/lib/solicitacoes-rotulos";

export const dynamic = "force-dynamic";
export const metadata = { title: "A minha conta" };

export default async function PaginaConta() {
  const utilizador = await getUtilizador();
  if (!utilizador) redirect("/entrar?destino=/conta");

  const meusPedidos = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, utilizador.id))
    .orderBy(desc(orders.createdAt));

  const [avisos, minhasSolicitacoes] = await Promise.all([
    avisosDoCliente(utilizador.id),
    db.select().from(serviceRequests).where(eq(serviceRequests.userId, utilizador.id)).orderBy(desc(serviceRequests.createdAt)),
  ]);

  const minhasMarcacoes = await db
    .select()
    .from(appointments)
    .where(eq(appointments.userId, utilizador.id))
    .orderBy(desc(appointments.date));

  const itens = meusPedidos.length
    ? await db
        .select()
        .from(orderItems)
        .where(
          inArray(
            orderItems.orderId,
            meusPedidos.map((p) => p.id)
          )
        )
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="regua font-display text-3xl">Olá, {utilizador.name.split(" ")[0]}</h1>
          <p className="mt-4 text-sm text-tinta-70">
            {utilizador.email}
            {utilizador.phone ? ` · ${utilizador.phone}` : ""}
          </p>
        </div>
        <BotaoSair />
      </div>

      {/* ------------------------------------------------- avisos */}
      <section className="mt-12" aria-labelledby="titulo-avisos">
        <h2 id="titulo-avisos" className="font-display text-xl">
          Avisos
        </h2>
        {avisos.length === 0 ? (
          <p className="mt-3 text-sm text-tinta-70">Ainda não tem avisos. Quando fizer um pedido, as novidades aparecem aqui.</p>
        ) : (
          <ul className="cartao mt-4 divide-y divide-marfim-200">
            {avisos.map((a) => (
              <li key={a.id} className="p-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  {a.link ? (
                    <Link href={a.link} className="font-medium hover:underline">
                      {a.title}
                    </Link>
                  ) : (
                    <span className="font-medium">{a.title}</span>
                  )}
                  <span className="text-xs text-tinta-50">{formatDateTime(a.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-line text-tinta-70">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------- solicitações */}
      {minhasSolicitacoes.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl">Maquilhagem e sapatos</h2>
          <ul className="cartao mt-4 divide-y divide-marfim-200">
            {minhasSolicitacoes.map((s) => {
              const e = ESTADO_SOLICITACAO[s.status as EstadoDeSolicitacao];
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                  <span className="num font-medium">{s.code}</span>
                  <span>{ROTULO_SOLICITACAO[s.type as TipoDeSolicitacao]}</span>
                  {s.eventDate && <span className="text-tinta-50">{formatNumericDate(s.eventDate)}</span>}
                  {e && <span className={`selo ml-auto ${e.cor}`}>{e.label}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------- marcações */}
      <section className="mt-12">
        <h2 className="font-display text-xl">Provas no ateliê</h2>
        {minhasMarcacoes.length === 0 ? (
          <p className="mt-3 text-sm text-tinta-70">
            Não tem provas marcadas.{" "}
            <Link href="/marcacao" className="text-ouro-escuro underline underline-offset-4">
              Marcar uma prova
            </Link>
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {minhasMarcacoes.map((m) => {
              const e = ESTADO_MARCACAO[m.status];
              return (
                <li key={m.id} className="cartao flex flex-wrap items-center gap-3 p-4 text-sm">
                  <span className="font-medium">
                    {formatNumericDate(m.date)} · {m.startTime}
                  </span>
                  <span className="text-tinta-70">{m.notes}</span>
                  <span className={`selo ml-auto ${e.cor}`}>{e.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* --------------------------------------------------- pedidos */}
      <section className="mt-12">
        <h2 className="font-display text-xl">Os meus pedidos</h2>
        {meusPedidos.length === 0 ? (
          <p className="mt-3 text-sm text-tinta-70">
            Ainda não fez nenhum pedido.{" "}
            <Link href="/loja" className="text-ouro-escuro underline underline-offset-4">
              Ver a colecção
            </Link>
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {meusPedidos.map((p) => {
              const estado = ESTADO_PEDIDO[p.status];
              const pagamento = ESTADO_PAGAMENTO[p.paymentStatus];
              const meus = itens.filter((i) => i.orderId === p.id);
              return (
                <li key={p.id} className="cartao p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/pedido/${p.number}`}
                      className="font-display text-lg hover:text-ouro-escuro"
                    >
                      {p.number}
                    </Link>
                    <span className={`selo ${estado.cor}`}>{estado.label}</span>
                    <span className={`selo ${pagamento.cor}`}>{pagamento.label}</span>
                    <span className="ml-auto font-medium">{formatKz(p.total)}</span>
                  </div>
                  <p className="mt-2 text-sm text-tinta-70">
                    {formatNumericDate(p.createdAt)} ·{" "}
                    {meus.map((i) => i.productName).join(", ") || "—"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
