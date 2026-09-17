import { exigirAcesso } from "@/lib/guarda";
import { mesAtual, relatorioMensal } from "@/lib/relatorios";
import { getSettings } from "@/lib/settings";
import { formatKz } from "@/lib/money";
import { formatNumericDate, MESES } from "@/lib/dates";
import BotaoImprimir from "@/components/admin/BotaoImprimir";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatório para imprimir" };

function nomeDoMes(mes: string) {
  const [ano, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} de ${ano}`;
}

/**
 * Relatório em folha A4, para guardar em PDF: no menu de impressão do
 * navegador escolhe-se "Guardar como PDF". Sem dependências novas, e o
 * resultado sai com a tipografia da DDRESS.
 */
export default async function PaginaRelatorioImprimir({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirAcesso("relatorios");

  const sp = await searchParams;
  const pedido = Array.isArray(sp.mes) ? sp.mes[0] : sp.mes;
  const mes = pedido && /^\d{4}-\d{2}$/.test(pedido) ? pedido : mesAtual();

  const [r, loja] = await Promise.all([relatorioMensal(mes), getSettings()]);
  const agora = new Date();

  const totais = [
    { rotulo: "Pedidos facturáveis", valor: String(r.totais.pedidos) },
    { rotulo: "Vendas", valor: formatKz(r.totais.vendas) },
    { rotulo: "Alugueres", valor: formatKz(r.totais.alugueres) },
    { rotulo: "Entregas", valor: formatKz(r.totais.entregas) },
    { rotulo: "Facturado", valor: formatKz(r.totais.facturado) },
    { rotulo: "Cauções cobradas", valor: formatKz(r.totais.caucoesCobradas) },
    { rotulo: "Cauções devolvidas", valor: formatKz(r.totais.caucoesDevolvidas) },
  ];

  return (
    <div className="folha mx-auto max-w-[52rem] bg-white p-8 text-tinta print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-tinta-70">
          Escolha “Guardar como PDF” na janela de impressão. Cabeçalhos e rodapés do navegador podem ser desligados aí.
        </p>
        <BotaoImprimir />
      </div>

      <header className="flex items-start justify-between gap-6 border-b-2 border-ouro pb-5">
        <div>
          <p className="rotulo text-ouro-escuro">{loja.storeName}</p>
          <h1 className="mt-2 font-display text-3xl">Relatório de {nomeDoMes(mes)}</h1>
          <p className="mt-2 text-xs text-tinta-70">
            {loja.address} · {loja.phone}
            {loja.email ? ` · ${loja.email}` : ""}
          </p>
        </div>
        <p className="num text-right text-xs text-tinta-50">
          Emitido em
          <br />
          {formatNumericDate(agora)}
        </p>
      </header>

      <section className="mt-6">
        <h2 className="rotulo text-tinta-50">Resumo do mês</h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {totais.map((t) => (
              <tr key={t.rotulo} className="border-b border-marfim-200">
                <th scope="row" className="py-1.5 text-left font-normal text-tinta-70">
                  {t.rotulo}
                </th>
                <td className="num py-1.5 text-right font-medium">{t.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-tinta-50">
          A caução é um valor guardado e devolvido à cliente: não entra no facturado.
        </p>
      </section>

      {r.porMetodo.length > 0 && (
        <section className="mt-6">
          <h2 className="rotulo text-tinta-50">Por método de pagamento</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-tinta/20 text-left text-xs text-tinta-50">
                <th className="py-1.5 font-normal">Método</th>
                <th className="py-1.5 text-right font-normal">Pedidos</th>
                <th className="py-1.5 text-right font-normal">Valor</th>
              </tr>
            </thead>
            <tbody>
              {r.porMetodo.map((m) => (
                <tr key={m.metodo} className="border-b border-marfim-200">
                  <td className="py-1.5">{m.metodo}</td>
                  <td className="num py-1.5 text-right">{m.pedidos}</td>
                  <td className="num py-1.5 text-right">{formatKz(m.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="mt-6">
        <h2 className="rotulo text-tinta-50">Pedidos do mês</h2>
        {r.linhas.length === 0 ? (
          <p className="mt-3 text-sm text-tinta-70">Sem pedidos facturáveis neste mês.</p>
        ) : (
          <table className="mt-3 w-full text-xs">
            <thead>
              <tr className="border-b border-tinta/20 text-left text-tinta-50">
                <th className="py-1.5 font-normal">Pedido</th>
                <th className="py-1.5 font-normal">Data</th>
                <th className="py-1.5 font-normal">Cliente</th>
                <th className="py-1.5 font-normal">Tipo</th>
                <th className="py-1.5 font-normal">Método</th>
                <th className="py-1.5 text-right font-normal">Vendas</th>
                <th className="py-1.5 text-right font-normal">Alugueres</th>
                <th className="py-1.5 text-right font-normal">Caução</th>
                <th className="py-1.5 text-right font-normal">Entrega</th>
                <th className="py-1.5 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {r.linhas.map((l) => (
                <tr key={l.numero} className="border-b border-marfim-200 break-inside-avoid">
                  <td className="num py-1.5">{l.numero}</td>
                  <td className="num py-1.5">{formatNumericDate(l.data)}</td>
                  <td className="py-1.5">{l.cliente}</td>
                  <td className="py-1.5">{l.tipo}</td>
                  <td className="py-1.5">{l.metodo}</td>
                  <td className="num py-1.5 text-right">{l.vendas ? formatKz(l.vendas) : "—"}</td>
                  <td className="num py-1.5 text-right">{l.alugueres ? formatKz(l.alugueres) : "—"}</td>
                  <td className="num py-1.5 text-right">{l.caucao ? formatKz(l.caucao) : "—"}</td>
                  <td className="num py-1.5 text-right">{l.entrega ? formatKz(l.entrega) : "—"}</td>
                  <td className="num py-1.5 text-right font-medium">{formatKz(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="mt-8 border-t border-marfim-200 pt-4 text-xs text-tinta-50">
        {loja.storeName} · {loja.tagline} · documento interno gerado pelo painel.
      </footer>
    </div>
  );
}
