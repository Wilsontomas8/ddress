import Link from "next/link";
import { Trash2 } from "lucide-react";
import { exigirAcesso } from "@/lib/guarda";
import { getPagina } from "@/lib/conteudos";
import { apagarDestaque, guardarDestaque, guardarPagina } from "@/app/admin/acoes-conteudos";
import FormularioAccao from "@/components/admin/FormularioAccao";
import BotaoAccao from "@/components/admin/BotaoAccao";
import EditorMedia from "@/components/admin/EditorMedia";
import IconeDestaque, { ICONES_DE_DESTAQUE } from "@/components/IconeDestaque";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quem somos" };

function EscolherIcone({ valor }: { valor?: string }) {
  return (
    <select name="icon" className="campo" defaultValue={valor ?? "estrela"} aria-label="Ícone">
      {Object.entries(ICONES_DE_DESTAQUE).map(([chave, i]) => (
        <option key={chave} value={chave}>
          {i.texto}
        </option>
      ))}
    </select>
  );
}

export default async function PaginaConteudos() {
  const eu = await exigirAcesso("conteudos");
  const dados = await getPagina("quem-somos", { mesmoNaoPublicada: true });

  if (!dados) {
    return <p className="cartao p-8 text-center text-sm text-tinta-70">A página Quem somos ainda não existe. Corra a semente da base de dados.</p>;
  }
  const { pagina, destaques, media } = dados;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Quem somos</h1>
          <p className="mt-1 text-sm text-tinta-70">Texto, destaques, vídeos e fotografias da página da loja.</p>
        </div>
        <Link href="/quem-somos" target="_blank" className="text-sm text-ouro-escuro hover:underline">
          Ver no site ↗
        </Link>
      </div>

      <div className="mt-8 space-y-8">
        <FormularioAccao acao={guardarPagina} podeEditar={eu.podeEditar} textoBotao="Guardar texto" className="cartao space-y-4 p-5">
          <input type="hidden" name="id" value={pagina.id} />
          <h2 className="font-display text-lg">Texto</h2>
          <label className="block">
            <span className="etiqueta">Título</span>
            <input name="title" className="campo" defaultValue={pagina.title} required />
          </label>
          <label className="block">
            <span className="etiqueta">Assinatura</span>
            <input name="subtitle" className="campo" defaultValue={pagina.subtitle} />
          </label>
          <label className="block">
            <span className="etiqueta">Descrição da loja (parágrafos separados por uma linha em branco)</span>
            <textarea name="body" className="campo min-h-48" defaultValue={pagina.body} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="published" defaultChecked={pagina.published} /> Publicada no site
          </label>
        </FormularioAccao>

        <section className="cartao p-5">
          <h2 className="font-display text-lg">Destaques</h2>
          <p className="mt-1 text-sm text-tinta-70">Ex.: “+ de 3000 mulheres atendidas”. Menor número de ordem aparece primeiro.</p>
          <ul className="mt-5 space-y-3">
            {destaques.map((d) => (
              <li key={d.id} className="flex flex-wrap items-end gap-3 border-b border-marfim-200 pb-3">
                <IconeDestaque nome={d.icon} className="mb-2.5 h-5 w-5 text-ouro-escuro" />
                <FormularioAccao
                  acao={guardarDestaque}
                  podeEditar={eu.podeEditar}
                  textoBotao="Guardar"
                  botaoClassName="btn btn-contorno"
                  className="flex min-w-0 flex-1 flex-wrap items-end gap-3"
                >
                  <input type="hidden" name="id" value={d.id} />
                  <label className="w-40">
                    <span className="etiqueta">Ícone</span>
                    <EscolherIcone valor={d.icon} />
                  </label>
                  <label className="min-w-48 flex-1">
                    <span className="etiqueta">Texto</span>
                    <input name="text" className="campo" defaultValue={d.text} required />
                  </label>
                  <label className="w-20">
                    <span className="etiqueta">Ordem</span>
                    <input name="position" type="number" className="campo" defaultValue={d.position} />
                  </label>
                </FormularioAccao>
                {eu.podeEditar && (
                  <BotaoAccao acao={apagarDestaque.bind(null, d.id)} confirmar="Apagar este destaque?" className="btn btn-perigo px-3" rotulo="Apagar destaque">
                    <Trash2 className="h-4 w-4" />
                  </BotaoAccao>
                )}
              </li>
            ))}
          </ul>

          {eu.podeEditar && (
            <FormularioAccao acao={guardarDestaque} textoBotao="Acrescentar destaque" limpar botaoClassName="btn btn-contorno" className="mt-5 flex flex-wrap items-end gap-3">
              <input type="hidden" name="pageId" value={pagina.id} />
              <label className="w-40">
                <span className="etiqueta">Ícone</span>
                <EscolherIcone />
              </label>
              <label className="min-w-48 flex-1">
                <span className="etiqueta">Novo destaque</span>
                <input name="text" className="campo" required />
              </label>
              <label className="w-20">
                <span className="etiqueta">Ordem</span>
                <input name="position" type="number" className="campo" defaultValue={destaques.length} />
              </label>
            </FormularioAccao>
          )}
        </section>

        <EditorMedia ownerType="PAGINA" ownerId={pagina.id} media={media} podeEditar={eu.podeEditar} />
      </div>
    </div>
  );
}
