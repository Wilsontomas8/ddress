import Link from "next/link";
import { exigirAcesso } from "@/lib/guarda";
import { mesAtual, relatorioMensal } from "@/lib/relatorios";
import { formatKz } from "@/lib/money";
import { formatNumericDate, MESES } from "@/lib/dates";
import { ESTADO_PEDIDO } from "@/lib/labels";
import type { OrderStatus } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatórios" };

function nomeDoMes(mes: string) {
  const [ano, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} de ${ano}`;
}

function mesVizinho(mes: string, passo: number) {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(ano, m - 1 + passo, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function PaginaRelatorios({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirAcesso("relatorios");

  const sp = await searchParams;
  const pedido = Array.isArray(sp.mes) ? sp.mes[0] : sp.mes;
  const mes = pedido && /^\d{4}-\d{2}$/.test(pedido) ? pedido : mesAtual();

  const r = await relatorioMensal(mes);

  const cartoes = [
    { rotulo: "Pedidos", valor: String(r.totais.pedidos) },
    { rotulo: "Vendas", valor: formatKz(r.totais.vendas) },
    { rotulo: "Alugueres", valor: formatKz(r.totais.alugueres) },
    { rotulo: "Entregas", valor: formatKz(r.totais.entregas) },
    { rotulo: "Facturado", valor: formatKz(r.totais.facturado) },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Relatório de {nomeDoMes(mes)}</h1>
          <p className="mt-1 text-sm text-tinta-70">
            Vendas, alugueres, cauções e entregas do mês. A caução não entra no facturado —
            é dinheiro do cliente à guarda da loja.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/relatorios?mes=${mesVizinho(mes, -1)}`}
            className="btn btn-contorno px-3 py-1.5 text-xs"
          >
            ← Mês anterior
          </Link>
          <Link href="/admin/relatorios" className="btn btn-contorno px-3 py-1.5 text-xs">
            Mês actual
          </Link>
          <Link
            href={`/admin/relatorios?mes=${mesVizinho(mes, 1)}`}
            className="btn btn-contorno px-3 py-1.5 text-xs"
          >
            Mês seguinte →
          </Link>
          <Link href={`/admin/relatorios/imprimir?mes=${mes}`} className="btn btn-contorno px-3 py-1.5 text-xs">
            Imprimir / PDF
          </Link>
          <a
            href={`/api/relatorios?mes=${mes}`}
            className="btn btn-principal px-3 py-1.5 text-xs"
          >
            Exportar para Excel (CSV)
          </a>
        </div>
      </div>

      {/* ------------------------------------------------------ totais */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cartoes.map((c) => (
          <div key={c.rotulo} className="cartao p-4">
            <p className="text-[0.7rem] tracking-[0.06em] text-tinta-50 uppercase">{c.rotulo}</p>
            <p className="mt-2 font-display text-xl">{c.valor}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* --------------------------------------------------- linhas */}
        <section>
          <h2 className="font-display text-xl">Pedidos do mês</h2>
          {r.linhas.length === 0 ? (
            <p className="cartao mt-4 p-6 text-sm text-tinta-70">
              Não há pedidos fechados neste mês.
            </p>
          ) : (
            <div className="cartao mt-4 overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Método</th>
                    <th className="text-right">Vendas</th>
                    <th className="text-right">Alugueres</th>
                    <th className="text-right">Caução</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {r.linhas.map((l) => (
                    <tr key={l.numero}>
                      <td className="whitespace-nowrap">{l.numero}</td>
                      <td className="whitespace-nowrap">{formatNumericDate(l.data)}</td>
                      <td>{l.cliente}</td>
                      <td className="text-xs">{l.tipo}</td>
                      <td className="text-xs">{l.metodo}</td>
                      <td className="text-right whitespace-nowrap">
                        {l.vendas ? formatKz(l.vendas) : "—"}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {l.alugueres ? formatKz(l.alugueres) : "—"}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {l.caucao ? formatKz(l.caucao) : "—"}
                      </td>
                      <td className="text-right whitespace-nowrap">{formatKz(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-marfim-50">
                    <td colSpan={5} className="font-medium">
                      Totais
                    </td>
                    <td className="text-right font-medium">{formatKz(r.totais.vendas)}</td>
                    <td className="text-right font-medium">{formatKz(r.totais.alugueres)}</td>
                    <td className="text-right font-medium">
                      {formatKz(r.totais.caucoesCobradas)}
                    </td>
                    <td className="text-right font-medium">{formatKz(r.totais.facturado)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* ------------------------------------------------- por método */}
        <aside className="space-y-6">
          <div className="cartao p-5">
            <h2 className="font-display text-lg">Por método de pagamento</h2>
            {r.porMetodo.length === 0 ? (
              <p className="mt-3 text-sm text-tinta-50">Sem movimentos.</p>
            ) : (
              <dl className="mt-3 space-y-2 text-sm">
                {r.porMetodo.map((m) => (
                  <div key={m.metodo} className="flex justify-between gap-3">
                    <dt className="text-tinta-70">
                      {m.metodo}
                      <span className="block text-xs text-tinta-50">{m.pedidos} pedido(s)</span>
                    </dt>
                    <dd className="whitespace-nowrap">{formatKz(m.valor)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="cartao p-5">
            <h2 className="font-display text-lg">Cauções</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-tinta-70">Cobradas</dt>
                <dd>{formatKz(r.totais.caucoesCobradas)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-tinta-70">Devolvidas</dt>
                <dd>{formatKz(r.totais.caucoesDevolvidas)}</dd>
              </div>
              <div className="flex justify-between border-t border-marfim-200 pt-2">
                <dt className="font-medium">Em poder da loja</dt>
                <dd className="font-medium">
                  {formatKz(r.totais.caucoesCobradas - r.totais.caucoesDevolvidas)}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
