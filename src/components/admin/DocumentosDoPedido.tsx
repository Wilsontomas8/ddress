import { FileText, Trash2 } from "lucide-react";
import { apagarDocumentoDoPedido, guardarDocumentoDoPedido } from "@/app/admin/acoes-conteudos";
import { formatDateTime } from "@/lib/dates";
import BotaoAccao from "./BotaoAccao";
import FormularioAccao from "./FormularioAccao";

export type DocumentoDoPedido = {
  id: string;
  kind: string;
  reference: string;
  url: string;
  note: string;
  createdAt: Date;
  quem: string | null;
};

const NOME_DA_ESPECIE: Record<string, string> = {
  FACTURA: "Factura",
  COMPROVATIVO: "Comprovativo",
  OUTRO: "Documento",
};

/**
 * Facturas do CEGID e outros papéis do pedido. A cliente vê-os na página
 * do seu pedido, por isso anexe só o que ela pode receber.
 */
export default function DocumentosDoPedido({
  orderId,
  documentos,
  podeEditar,
  faltaFactura = false,
}: {
  orderId: string;
  documentos: DocumentoDoPedido[];
  podeEditar: boolean;
  /** O pedido já devia ter factura e ainda não tem */
  faltaFactura?: boolean;
}) {
  return (
    <section id="documentos" className={`cartao scroll-mt-24 p-5 ${faltaFactura ? "border-l-2 border-l-ouro" : ""}`}>
      <h2 className="font-display text-lg">Factura do CEGID</h2>
      <p className="mt-1 text-sm text-tinta-70">
        Registe o número da factura emitida no CEGID. A cliente vê-o na página do pedido dela.
      </p>
      {faltaFactura && (
        <p className="mt-3 text-sm text-ouro-escuro">
          Este pedido já está a ser finalizado: registe o número da factura do CEGID.
        </p>
      )}

      {documentos.length === 0 ? (
        <p className="mt-4 text-sm text-tinta-50">Ainda sem factura registada.</p>
      ) : (
        <ul className="mt-4 divide-y divide-marfim-200">
          {documentos.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
              <FileText className="h-4 w-4 shrink-0 text-ouro-escuro" strokeWidth={1.6} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-ouro-escuro hover:underline">
                    {NOME_DA_ESPECIE[d.kind] ?? d.kind}
                    {d.reference ? ` ${d.reference}` : ""}
                  </a>
                ) : (
                  <span className="num block truncate text-sm">
                    {NOME_DA_ESPECIE[d.kind] ?? d.kind}
                    {d.reference ? ` ${d.reference}` : ""}
                  </span>
                )}
                <span className="block text-xs text-tinta-50">
                  {formatDateTime(d.createdAt)}
                  {d.quem ? ` · ${d.quem}` : ""}
                  {d.note ? ` · ${d.note}` : ""}
                </span>
              </span>
              {podeEditar && (
                <BotaoAccao acao={apagarDocumentoDoPedido.bind(null, d.id)} confirmar="Remover este documento?" className="btn btn-perigo px-3" rotulo="Remover documento">
                  <Trash2 className="h-4 w-4" />
                </BotaoAccao>
              )}
            </li>
          ))}
        </ul>
      )}

      {podeEditar && (
        <FormularioAccao
          acao={guardarDocumentoDoPedido}
          textoBotao="Registar factura"
          limpar
          botaoClassName="btn btn-contorno"
          className="mt-5 space-y-4 border-t border-marfim-200 pt-5"
        >
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="kind" value="FACTURA" />
          <input type="hidden" name="url" value="" />
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
            <label>
              <span className="etiqueta">Número da factura (CEGID)</span>
              <input name="reference" className="campo num" placeholder="FT 2026/123" maxLength={60} required />
            </label>
            <label>
              <span className="etiqueta">Nota (opcional)</span>
              <input name="note" className="campo" maxLength={300} />
            </label>
          </div>
        </FormularioAccao>
      )}
    </section>
  );
}
