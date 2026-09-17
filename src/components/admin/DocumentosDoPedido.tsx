import { FileText, Trash2 } from "lucide-react";
import { apagarDocumentoDoPedido, guardarDocumentoDoPedido } from "@/app/admin/acoes-conteudos";
import { formatDateTime } from "@/lib/dates";
import BotaoAccao from "./BotaoAccao";
import CarregarFicheiro from "./CarregarFicheiro";
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
}: {
  orderId: string;
  documentos: DocumentoDoPedido[];
  podeEditar: boolean;
}) {
  return (
    <section className="cartao p-5">
      <h2 className="font-display text-lg">Documentos</h2>
      <p className="mt-1 text-sm text-tinta-70">
        Factura do CEGID, comprovativos e outros papéis. A cliente vê-os na página do pedido dela.
      </p>

      {documentos.length === 0 ? (
        <p className="mt-4 text-sm text-tinta-50">Ainda sem documentos.</p>
      ) : (
        <ul className="mt-4 divide-y divide-marfim-200">
          {documentos.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
              <FileText className="h-4 w-4 shrink-0 text-ouro-escuro" strokeWidth={1.6} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <a href={d.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-ouro-escuro hover:underline">
                  {NOME_DA_ESPECIE[d.kind] ?? d.kind}
                  {d.reference ? ` ${d.reference}` : ""}
                </a>
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
          textoBotao="Anexar"
          limpar
          botaoClassName="btn btn-contorno"
          className="mt-5 space-y-4 border-t border-marfim-200 pt-5"
        >
          <input type="hidden" name="orderId" value={orderId} />
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <label>
              <span className="etiqueta">Tipo</span>
              <select name="kind" className="campo" defaultValue="FACTURA">
                <option value="FACTURA">Factura</option>
                <option value="COMPROVATIVO">Comprovativo</option>
                <option value="OUTRO">Outro</option>
              </select>
            </label>
            <label>
              <span className="etiqueta">Número da factura (CEGID)</span>
              <input name="reference" className="campo" placeholder="FT 2026/123" maxLength={60} />
            </label>
            <label className="sm:col-span-2">
              <span className="etiqueta">Ficheiro (PDF ou imagem)</span>
              <input name="url" className="campo" placeholder="https://… ou carregue o ficheiro" required />
              <span className="mt-2 block">
                <CarregarFicheiro area="pedidos" campo="url" aceita="application/pdf,image/*" texto="Carregar documento" />
              </span>
            </label>
            <label className="sm:col-span-2">
              <span className="etiqueta">Nota (opcional)</span>
              <input name="note" className="campo" maxLength={300} />
            </label>
          </div>
        </FormularioAccao>
      )}
    </section>
  );
}
