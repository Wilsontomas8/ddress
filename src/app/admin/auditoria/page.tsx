import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { orderEvents, orders, users } from "@/db/schema";
import { exigirAcesso } from "@/lib/guarda";
import { formatDateTime } from "@/lib/dates";
import { PAPEL } from "@/lib/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Auditoria" };

const TIPOS = [
  { valor: "", texto: "Tudo" },
  { valor: "CRIADO", texto: "Criação de pedidos" },
  { valor: "ATRIBUIDO", texto: "Atribuições" },
  { valor: "ESTADO", texto: "Mudanças de estado" },
  { valor: "PAGAMENTO", texto: "Pagamentos e cauções" },
  { valor: "PROVA", texto: "Provas" },
  { valor: "ENTREGA", texto: "Entregas" },
  { valor: "RECOLHA", texto: "Recolhas" },
  { valor: "NOTA", texto: "Notas internas" },
];

const COR_DO_TIPO: Record<string, string> = {
  CRIADO: "tom-neutro",
  ATRIBUIDO: "tom-azul",
  ESTADO: "tom-azul",
  PAGAMENTO: "tom-verde",
  PROVA: "tom-violeta",
  ENTREGA: "tom-ouro",
  RECOLHA: "tom-ouro",
  NOTA: "bg-marfim-200 text-tinta-70",
};

export default async function PaginaAuditoria({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirAcesso("auditoria");

  const sp = await searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const tipo = um(sp.tipo) ?? "";
  const procura = um(sp.q)?.trim();

  const condicoes = [];
  if (tipo) condicoes.push(eq(orderEvents.type, tipo));
  if (procura) {
    const termo = `%${procura}%`;
    condicoes.push(
      or(ilike(orderEvents.message, termo), ilike(orders.number, termo), ilike(users.name, termo))!
    );
  }

  const registos = await db
    .select({
      e: orderEvents,
      quem: users.name,
      papel: users.role,
      pedidoId: orders.id,
      pedidoNumero: orders.number,
    })
    .from(orderEvents)
    .leftJoin(users, eq(orderEvents.actorId, users.id))
    .leftJoin(orders, eq(orderEvents.orderId, orders.id))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(orderEvents.createdAt))
    .limit(300);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Auditoria</h1>
          <p className="mt-1 text-sm text-tinta-70">
            Registo das acções sobre pedidos, pagamentos, provas, entregas e cauções — quem
            fez, o quê e quando. Mostramos os {registos.length} registos mais recentes.
          </p>
        </div>

        <form className="flex gap-2" action="/admin/auditoria">
          <input
            className="campo w-56"
            name="q"
            defaultValue={procura ?? ""}
            placeholder="Pedido, pessoa ou texto"
          />
          <input type="hidden" name="tipo" value={tipo} />
          <button className="btn btn-contorno" type="submit">
            Procurar
          </button>
        </form>
      </div>

      <nav className="mt-6 flex flex-wrap gap-1 border-b border-marfim-200">
        {TIPOS.map((t) => {
          const ativo = tipo === t.valor;
          return (
            <Link
              key={t.valor || "tudo"}
              href={t.valor ? `/admin/auditoria?tipo=${t.valor}` : "/admin/auditoria"}
              className={`border-b-2 px-3 py-2 text-sm ${
                ativo
                  ? "border-ouro text-ouro-escuro"
                  : "border-transparent text-tinta-70 hover:text-tinta"
              }`}
            >
              {t.texto}
            </Link>
          );
        })}
      </nav>

      {registos.length === 0 ? (
        <p className="cartao mt-6 p-8 text-center text-sm text-tinta-70">
          Não há registos com estes filtros.
        </p>
      ) : (
        <div className="cartao mt-6 overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Tipo</th>
                <th>Acção</th>
                <th>Quem</th>
                <th>Pedido</th>
              </tr>
            </thead>
            <tbody>
              {registos.map(({ e, quem, papel, pedidoId, pedidoNumero }) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap text-xs">{formatDateTime(e.createdAt)}</td>
                  <td>
                    <span className={`selo ${COR_DO_TIPO[e.type] ?? "tom-neutro"}`}>
                      {e.type}
                    </span>
                  </td>
                  <td className="max-w-[34rem] text-sm">{e.message}</td>
                  <td className="text-xs">
                    {quem ?? <span className="text-tinta-50">sistema / cliente</span>}
                    {papel && <span className="block text-tinta-50">{PAPEL[papel]}</span>}
                  </td>
                  <td className="text-xs whitespace-nowrap">
                    {pedidoId ? (
                      <Link
                        href={`/admin/pedidos/${pedidoId}`}
                        className="text-ouro-escuro hover:underline"
                      >
                        {pedidoNumero}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-tinta-50">
        O registo é imutável: as acções são acrescentadas, nunca alteradas nem apagadas.
      </p>
    </div>
  );
}
