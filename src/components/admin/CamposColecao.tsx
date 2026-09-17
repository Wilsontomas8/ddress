import { guardarColecao } from "@/app/admin/acoes-conteudos";
import type { Collection } from "@/db/schema";
import FormularioAccao from "./FormularioAccao";

export type PecaParaEscolher = { id: string; name: string; imagem: string | null; categoria: string };

/** Dados da colecção e as peças que a compõem */
export default function CamposColecao({
  colecao,
  pecas,
  marcadas,
  podeEditar,
}: {
  colecao?: Collection;
  pecas: PecaParaEscolher[];
  marcadas: string[];
  podeEditar: boolean;
}) {
  return (
    <FormularioAccao acao={guardarColecao} podeEditar={podeEditar} irPara="/admin/colecoes/{id}" textoBotao={colecao ? "Guardar colecção" : "Criar colecção"}>
      {colecao && <input type="hidden" name="id" value={colecao.id} />}

      <section className="cartao p-5">
        <h2 className="font-display text-lg">A colecção</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="etiqueta">Nome</span>
            <input name="name" className="campo" defaultValue={colecao?.name} required />
          </label>
          <label>
            <span className="etiqueta">Endereço (fica /colecoes/…)</span>
            <input name="slug" className="campo" defaultValue={colecao?.slug} placeholder="gerado a partir do nome" />
          </label>
          <label className="sm:col-span-2">
            <span className="etiqueta">Frase curta</span>
            <input name="tagline" className="campo" defaultValue={colecao?.tagline} maxLength={160} />
          </label>
          <label className="sm:col-span-2">
            <span className="etiqueta">Descrição</span>
            <textarea name="description" className="campo min-h-28" defaultValue={colecao?.description} />
          </label>
          <label>
            <span className="etiqueta">Imagem de capa</span>
            <input name="coverImage" className="campo" defaultValue={colecao?.coverImage ?? ""} placeholder="/quem-somos/galeria/foto-01.jpg" />
          </label>
          <label>
            <span className="etiqueta">Vídeo de abertura</span>
            <input name="heroVideo" className="campo" defaultValue={colecao?.heroVideo ?? ""} placeholder="/video/ddress-colecao.mp4" />
          </label>
          <label>
            <span className="etiqueta">Capa do vídeo</span>
            <input name="heroPoster" className="campo" defaultValue={colecao?.heroPoster ?? ""} />
          </label>
          <label>
            <span className="etiqueta">Ordem</span>
            <input name="position" type="number" className="campo" defaultValue={colecao?.position ?? 0} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={colecao?.active ?? true} /> Visível no site
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" defaultChecked={colecao?.featured ?? false} /> Em destaque
          </label>
        </div>
      </section>

      <section className="cartao p-5">
        <h2 className="font-display text-lg">Peças da colecção</h2>
        <p className="mt-1 text-sm text-tinta-70">Marque as peças para alugar ou vender nesta colecção. Uma peça pode estar em várias.</p>
        <ul className="mt-4 grid max-h-[32rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {pecas.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 border border-marfim-200 p-2 has-[:checked]:border-ouro">
                <input type="checkbox" name="produtos" value={p.id} defaultChecked={marcadas.includes(p.id)} />
                {p.imagem && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imagem} alt="" className="h-12 w-9 shrink-0 object-cover" />
                )}
                <span className="min-w-0 text-sm leading-tight">
                  <span className="block truncate">{p.name}</span>
                  <span className="block text-xs text-tinta-50">{p.categoria}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>
    </FormularioAccao>
  );
}
