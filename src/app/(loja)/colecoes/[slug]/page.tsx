import Link from "next/link";
import { notFound } from "next/navigation";
import CartaoProduto from "@/components/CartaoProduto";
import GaleriaSlides from "@/components/GaleriaSlides";
import { getColecao, listarColecoes } from "@/lib/conteudos";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await getColecao(slug);
  if (!dados) return { title: "Colecção não encontrada" };
  return { title: `Colecção ${dados.colecao.name}`, description: dados.colecao.tagline || dados.colecao.description.slice(0, 160) };
}

const TIPOS = [
  { valor: "", texto: "Todas as peças" },
  { valor: "aluguer", texto: "Para alugar" },
  { valor: "venda", texto: "Para comprar" },
];

export default async function PaginaColecao({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  const [{ slug }, { tipo = "" }] = await Promise.all([params, searchParams]);
  const [dados, todas] = await Promise.all([getColecao(slug), listarColecoes()]);
  if (!dados) notFound();
  const { colecao, media, pecas } = dados;

  const filtradas = pecas.filter((p) =>
    tipo === "aluguer" ? p.oferta !== "VENDA" : tipo === "venda" ? p.oferta !== "ALUGUER" : true
  );
  const imagens = media.filter((m) => m.kind === "IMAGEM");
  const videos = media.filter((m) => m.kind === "VIDEO");
  const video = colecao.heroVideo ? { url: colecao.heroVideo, poster: colecao.heroPoster } : videos[0] ? { url: videos[0].url, poster: videos[0].poster } : null;
  const outras = todas.filter((c) => c.id !== colecao.id);

  return (
    <>
      {/* ------------------------------------------------ abertura */}
      <section className="relative isolate overflow-hidden bg-preto text-marfim-50">
        {colecao.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={colecao.coverImage} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
        )}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(10_10_10/0.9),rgb(10_10_10/0.5))]" />

        <div className="mx-auto grid max-w-[90rem] items-center gap-10 px-4 pt-14 pb-16 sm:px-8 sm:pt-20 lg:grid-cols-[1.2fr_1fr] lg:pb-24">
          <div>
            <nav aria-label="Caminho" className="rotulo text-[0.625rem] text-marfim-400">
              <Link href="/colecoes" className="hover:text-ouro-claro">
                Colecções
              </Link>
              <span className="mx-2">/</span>
              <span className="text-marfim-200">{colecao.name}</span>
            </nav>
            <h1 className="mt-6 font-display text-6xl leading-[0.92] tracking-[-0.03em] sm:text-8xl">
              {colecao.name}
              <span className="texto-ouro italic">.</span>
            </h1>
            {colecao.tagline && <p className="mt-6 max-w-lg font-display text-2xl leading-snug text-marfim-100 italic">{colecao.tagline}</p>}
            {colecao.description && <p className="mt-5 max-w-lg text-marfim-200">{colecao.description}</p>}
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#pecas" className="btn btn-principal">
                Ver as {pecas.length} peças
              </a>
              <Link href="/marcacao" className="btn btn-contorno-claro">
                Marcar prova
              </Link>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm lg:max-w-md">
            {video ? (
              <div className="relative aspect-[9/16] max-h-[44rem] overflow-hidden bg-carvao ring-1 ring-ouro/35">
                <video
                  src={video.url}
                  poster={video.poster ?? colecao.coverImage ?? undefined}
                  className="h-full w-full object-cover"
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="metadata"
                  aria-label={`Vídeo da colecção ${colecao.name}`}
                />
              </div>
            ) : imagens.length > 0 ? (
              <GaleriaSlides rotulo={`Colecção ${colecao.name}`} imagens={imagens.map((i) => ({ url: i.url, titulo: i.title }))} />
            ) : null}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ fotografias (quando há vídeo em cima) */}
      {video && imagens.length > 0 && (
        <section aria-label={`Fotografias da colecção ${colecao.name}`} className="bg-preto pb-2">
          <ul className="sem-barra flex gap-2 overflow-x-auto px-4 pb-4 sm:px-8">
            {imagens.map((i) => (
              <li key={i.id} className="w-56 shrink-0 sm:w-72">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.url} alt={i.title || `Colecção ${colecao.name}`} loading="lazy" className="aspect-[3/4] w-full object-cover" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------ peças */}
      <section id="pecas" className="scroll-mt-24">
        <div className="sticky top-16 z-30 border-b border-marfim-200 bg-marfim-50/95 backdrop-blur sm:top-20">
          <div className="sem-barra mx-auto flex max-w-[90rem] items-center gap-2 overflow-x-auto px-4 py-3 sm:px-8">
            {TIPOS.map((t) => (
              <Link
                key={t.valor || "todas"}
                href={t.valor ? `/colecoes/${colecao.slug}?tipo=${t.valor}#pecas` : `/colecoes/${colecao.slug}#pecas`}
                className="chip"
                aria-current={tipo === t.valor ? "true" : undefined}
                scroll={false}
              >
                {t.texto}
              </Link>
            ))}
            <span className="num ml-auto shrink-0 pl-4 text-sm text-tinta-50">
              {filtradas.length} {filtradas.length === 1 ? "peça" : "peças"}
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-[90rem] px-4 py-12 sm:px-8 sm:py-16">
          {filtradas.length === 0 ? (
            <p className="py-16 text-center text-tinta-70">
              Não há peças {tipo === "aluguer" ? "para alugar" : tipo === "venda" ? "para comprar" : ""} nesta colecção de momento.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
              {filtradas.map((p) => (
                <CartaoProduto key={p.id} produto={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------ outras colecções */}
      {outras.length > 0 && (
        <section className="border-t border-marfim-200">
          <div className="mx-auto max-w-[90rem] px-4 py-16 sm:px-8">
            <p className="rotulo text-tinta-50">Outras colecções</p>
            <ul className="mt-6 flex flex-wrap gap-3">
              {outras.map((c) => (
                <li key={c.id}>
                  <Link href={`/colecoes/${c.slug}`} className="chip">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
