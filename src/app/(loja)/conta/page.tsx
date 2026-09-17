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
