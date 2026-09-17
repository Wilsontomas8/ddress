import Link from "next/link";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { formatKz } from "@/lib/money";
import { formatNumericDate } from "@/lib/dates";
import { ESTADO_PAGAMENTO, ESTADO_PEDIDO } from "@/lib/labels";
import type { OrderStatus } from "@/db/schema";
import { exigirAcesso } from "@/lib/guarda";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pedidos" };

const SEPARADORES: { chave: string; texto: string; estados?: OrderStatus[] }[] = [
  { chave: "tratar", texto: "Por tratar", estados: ["NOVO", "RECEBIDO", "AGUARDA_PROVA"] },
  { chave: "confirmados", texto: "Confirmados", estados: ["CONFIRMADO", "PAGO", "PRONTO"] },
  { chave: "aluguer", texto: "Em aluguer", estados: ["EM_ALUGUER", "DEVOLVIDO"] },
  { chave: "fechados", texto: "Fechados", estados: ["ENTREGUE", "CONCLUIDO", "CANCELADO"] },
  { chave: "todos", texto: "Todos" },
];

export default async function PaginaPedidos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirAcesso("pedidos");

  const sp = await searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const separador = um(sp.separador) ?? "tratar";
  const estadoUnico = um(sp.estado) as OrderStatus | undefined;
  const procura = um(sp.q)?.trim();

  const condicoes = [];

  if (estadoUnico) {
    condicoes.push(eq(orders.status, estadoUnico));
  } else {
    const def = SEPARADORES.find((s) => s.chave === separador);
    if (def?.estados) condicoes.push(inArray(orders.status, def.estados));
  }

  if (procura) {
    const termo = `%${procura}%`;
    condicoes.push(
      or(
        ilike(orders.number, termo),
        ilike(orders.customerName, termo),
        ilike(orders.customerPhone, termo)
      )!
    );
  }

  const linhas = await db
    .select({ p: orders, funcionario: users.name })
    .from(orders)
    .leftJoin(users, eq(orders.assignedToId, users.id))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(100);

  const itens = linhas.length
    ? await db
        .select()
        .from(orderItems)
        .where(
          inArray(
            orderItems.orderId,
            linhas.map((l) => l.p.id)
          )
        )
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Pedidos</h1>
          <p className="mt-1 text-sm text-tinta-70">
            Receba o pedido, confirme com o cliente e feche a venda ou o aluguer.
          </p>
        </div>

        <form className="flex gap-2" action="/admin/pedidos">
          <input
            className="campo w-56"
            name="q"
            defaultValue={procura ?? ""}
            placeholder="Nº do pedido, nome ou telefone"
          />
          <input type="hidden" name="separador" value="todos" />
          <button className="btn btn-contorno" type="submit">
            Procurar
          </button>
        </form>
      </div>

      <nav className="mt-6 flex flex-wrap gap-1 border-b border-marfim-200">
        {SEPARADORES.map((s) => {
          const ativo = !estadoUnico && separador === s.chave;
          return (
            <Link
              key={s.chave}
              href={`/admin/pedidos?separador=${s.chave}`}
              className={`border-b-2 px-3 py-2 text-sm ${
                ativo ? "border-ouro text-ouro-escuro" : "border-transparent text-tinta-70 hover:text-tinta"
              }`}
            >
              {s.texto}
            </Link>
          );
        })}
      </nav>

      {linhas.length === 0 ? (
        <p className="cartao mt-6 p-8 text-center text-sm text-tinta-70">
          Não há pedidos nesta lista.
        </p>
      ) : (
        <div className="cartao mt-6 overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Peças</th>
                <th>Estado</th>
                <th>Pagamento</th>
                <th>Responsável</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ p, funcionario }) => {
                const e = ESTADO_PEDIDO[p.status];
                const pg = ESTADO_PAGAMENTO[p.paymentStatus];
                const meus = itens.filter((i) => i.orderId === p.id);
                const aluguer = meus.some((i) => i.kind === "ALUGUER");

                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">
                      <Link
                        href={`/admin/pedidos/${p.id}`}
                        className="text-ouro-escuro hover:underline"
                      >
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
                    <td className="max-w-64">
                      <span className="text-xs text-tinta-70">
                        {meus.map((i) => i.productName).join(", ")}
                      </span>
                      {aluguer && (
                        <span className="mt-1 block text-[0.65rem] tracking-wider text-ouro-escuro uppercase">
                          aluguer
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`selo ${e.cor}`}>{e.label}</span>
                      {p.needsFitting && (
                        <span className="mt-1 block text-[0.65rem] text-tinta-50">
                          exige prova
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`selo ${pg.cor}`}>{pg.label}</span>
                    </td>
                    <td className="text-xs text-tinta-70">
                      {funcionario ?? <span className="text-ouro-escuro">por atribuir</span>}
                    </td>
                    <td className="text-right whitespace-nowrap">{formatKz(p.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
