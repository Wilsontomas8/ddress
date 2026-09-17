import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pages, type homeSlides } from "@/db/schema";
import { exigirAcesso } from "@/lib/guarda";
import { mediaDe, todosOsSlides } from "@/lib/conteudos";
import { apagarSlide, guardarSlide } from "@/app/admin/acoes-conteudos";
import FormularioAccao from "@/components/admin/FormularioAccao";
import BotaoAccao from "@/components/admin/BotaoAccao";
import EditorMedia from "@/components/admin/EditorMedia";

export const dynamic = "force-dynamic";
export const metadata = { title: "Página inicial" };

type Slide = typeof homeSlides.$inferSelect;

function CamposSlide({ s }: { s?: Slide }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {s && <input type="hidden" name="id" value={s.id} />}
      <label className="sm:col-span-2">
        <span className="etiqueta">Linha pequena (por cima do título)</span>
        <input name="kicker" className="campo" defaultValue={s?.kicker} maxLength={120} placeholder="Luanda · Venda e aluguer de vestidos" />
      </label>
      <label>
        <span className="etiqueta">Título — primeira linha</span>
        <input name="titleTop" className="campo" defaultValue={s?.titleTop} required placeholder="Vista a peça" />
      </label>
      <label>
        <span className="etiqueta">Título — segunda linha (sai em itálico)</span>
        <input name="titleBottom" className="campo" defaultValue={s?.titleBottom} maxLength={80} placeholder="certa." />
      </label>
      <label className="sm:col-span-2">
        <span className="etiqueta">Texto</span>
        <textarea name="text" className="campo min-h-24" defaultValue={s?.text} maxLength={400} />
      </label>
      <label>
        <span className="etiqueta">Botão principal</span>
        <input name="primaryLabel" className="campo" defaultValue={s?.primaryLabel} maxLength={40} placeholder="Ver a colecção" />
      </label>
      <label>
        <span className="etiqueta">Para onde leva</span>
        <input name="primaryHref" className="campo" defaultValue={s?.primaryHref} placeholder="/loja" />
      </label>
      <label>
        <span className="etiqueta">Segundo botão (opcional)</span>
        <input name="secondaryLabel" className="campo" defaultValue={s?.secondaryLabel} maxLength={40} />
      </label>
      <label>
        <span className="etiqueta">Para onde leva</span>
        <input name="secondaryHref" className="campo" defaultValue={s?.secondaryHref} placeholder="/como-funciona" />
      </label>
      <label>
        <span className="etiqueta">Ordem</span>
        <input name="position" type="number" className="campo" defaultValue={s?.position ?? 0} />
      </label>
      <label className="flex items-center gap-2 self-end pb-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={s?.active ?? true} /> Visível na página inicial
      </label>
    </div>
  );
}

export default async function PaginaInicialAdmin() {
  const eu = await exigirAcesso("conteudos");
  const [pagina] = await db.select().from(pages).where(eq(pages.slug, "inicio"));
  const [slides, media] = await Promise.all([todosOsSlides(), pagina ? mediaDe("PAGINA", pagina.id) : Promise.resolve([])]);

  return (
    <div className="max-w-5xl">
      <nav className="text-xs text-tinta-50">
        <Link href="/admin/conteudos" className="hover:text-ouro-escuro">
          Conteúdos
        </Link>
        <span className="mx-1.5">/</span>
        <span>Página inicial</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Página inicial</h1>
          <p className="mt-1 text-sm text-tinta-70">
            O vídeo de fundo e os textos que passam por cima dele. O primeiro vídeo da lista é o que corre atrás dos slides.
          </p>
        </div>
        <Link href="/" target="_blank" className="text-sm text-ouro-escuro hover:underline">
          Ver no site ↗
        </Link>
      </div>

      <div className="mt-8 space-y-8">
        {pagina ? (
          <EditorMedia ownerType="PAGINA" ownerId={pagina.id} media={media} podeEditar={eu.podeEditar} />
        ) : (
          <p className="cartao p-6 text-sm text-tinta-70">
            A página inicial ainda não existe na base de dados — o site está a usar o vídeo que veio instalado. Corra a semente para
            poder geri-lo aqui.
          </p>
        )}

        <section className="cartao p-5">
          <h2 className="font-display text-lg">Slides</h2>
          <p className="mt-1 text-sm text-tinta-70">
            Cada slide fica 8 segundos no ecrã. Sem slides visíveis, o site mostra os textos que vieram instalados.
          </p>

          <ul className="mt-5 space-y-3">
            {slides.map((s) => (
              <li key={s.id} className="border-b border-marfim-200 pb-4 last:border-0">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                    <span className="font-display text-lg">
                      {s.titleTop} <span className="italic">{s.titleBottom}</span>
                    </span>
                    <span className={`selo ${s.active ? "tom-verde" : "tom-neutro"}`}>{s.active ? "Visível" : "Escondido"}</span>
                    <span className="num text-xs text-tinta-50">ordem {s.position}</span>
                  </summary>
                  <div className="mt-4 space-y-4">
                    <FormularioAccao acao={guardarSlide} podeEditar={eu.podeEditar} className="space-y-4">
                      <CamposSlide s={s} />
                    </FormularioAccao>
                    {eu.podeEditar && (
                      <BotaoAccao acao={apagarSlide.bind(null, s.id)} confirmar={`Apagar o slide "${s.titleTop}"?`} className="btn btn-perigo">
                        Apagar slide
                      </BotaoAccao>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>

          {eu.podeEditar && (
            <div className="mt-6 border-t border-marfim-200 pt-5">
              <h3 className="font-display text-base">Novo slide</h3>
              <FormularioAccao acao={guardarSlide} limpar textoBotao="Criar slide" botaoClassName="btn btn-contorno" className="mt-4 space-y-4">
                <CamposSlide />
              </FormularioAccao>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
