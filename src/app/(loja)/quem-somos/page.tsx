import Link from "next/link";
import { notFound } from "next/navigation";
import GaleriaSlides from "@/components/GaleriaSlides";
import MapaDaLoja from "@/components/MapaDaLoja";
import IconeDestaque from "@/components/IconeDestaque";
import { getPagina } from "@/lib/conteudos";
import { getSettings } from "@/lib/settings";
import { ligacaoWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const dados = await getPagina("quem-somos");
  return {
    title: "Quem somos",
    description: dados?.pagina.subtitle || "A DDRESS: aluguer e venda de vestidos em Luanda.",
  };
}

export default async function PaginaQuemSomos() {
  const [dados, loja] = await Promise.all([getPagina("quem-somos"), getSettings()]);
  if (!dados) notFound();
  const { pagina, destaques, media } = dados;

  const videos = media.filter((m) => m.kind === "VIDEO");
  const imagens = media.filter((m) => m.kind === "IMAGEM");
  const [principal, ...galeria] = imagens;
  const whatsapp = ligacaoWhatsApp(loja.whatsapp, "Olá DDRESS! Gostaria de saber mais sobre os vossos vestidos.");

  return (
    <>
      {/* ------------------------------------------------ abertura */}
      <section className="relative isolate overflow-hidden bg-preto text-marfim-50">
        {principal && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={principal.url} alt={principal.title || pagina.title} className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_30%]" />
        )}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(10_10_10/0.35)_0%,rgb(10_10_10/0.1)_40%,rgb(10_10_10/0.9)_100%)]" />
        <div className="mx-auto flex min-h-[80svh] max-w-[90rem] flex-col justify-end px-4 pt-40 pb-16 sm:px-8 sm:pb-20">
          <p className="rotulo text-ouro-claro">Quem somos</p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.95] tracking-[-0.03em] sm:text-7xl lg:text-8xl">
            {pagina.subtitle.replace(/\.$/, "")}
            <span className="texto-ouro italic">.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-marfim-100/85 sm:text-lg">{pagina.title}</p>
        </div>
      </section>

      {/* ------------------------------------------------ destaques */}
      {destaques.length > 0 && (
        <section aria-label="A DDRESS em números" className="border-b border-marfim-200 bg-marfim-50">
          <ul className="mx-auto grid max-w-[90rem] grid-cols-2 px-4 sm:px-8 lg:grid-cols-4">
            {destaques.map((d) => {
              const telefone = d.icon === "telefone";
              const conteudo = (
                <>
                  <IconeDestaque nome={d.icon} className="h-7 w-7 text-ouro-escuro" />
                  <span className="mt-4 block font-display text-2xl leading-tight sm:text-3xl">{d.text}</span>
                </>
              );
              return (
                <li key={d.id} className="border-marfim-200 py-10 pr-4 even:pl-4 sm:px-6 lg:border-l lg:first:border-l-0 lg:first:pl-0">
                  {telefone ? (
                    <a href={`tel:+244${d.text.replace(/\D/g, "")}`} className="block transition-colors hover:text-ouro-escuro">
                      {conteudo}
                    </a>
                  ) : (
                    conteudo
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------ história + vídeo */}
      <section className="mx-auto grid max-w-[90rem] gap-12 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="rotulo text-tinta-50">A nossa casa</p>
          <h2 className="mt-5 font-display text-4xl leading-[1.02] sm:text-6xl">
            Vestidos escolhidos <span className="italic">um a um.</span>
          </h2>
          <div className="mt-8 max-w-xl space-y-5 text-[1.0625rem] leading-relaxed text-tinta-70">
            {pagina.body.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/colecoes" className="btn btn-escuro">
              Ver as colecções
            </Link>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noreferrer" className="btn btn-contorno">
                Falar connosco no WhatsApp
              </a>
            )}
          </div>
        </div>

        {videos[0] && (
          <div className="mx-auto w-full max-w-sm">
            <div className="relative aspect-[9/16] overflow-hidden bg-preto ring-1 ring-ouro/30">
              <video
                src={videos[0].url}
                poster={videos[0].poster ?? undefined}
                className="h-full w-full object-cover"
                muted
                loop
                playsInline
                autoPlay
                controls
                preload="metadata"
                aria-label={videos[0].title || "Vídeo da DDRESS"}
              />
            </div>
            {videos[0].title && <p className="rotulo mt-3 text-[0.625rem] text-tinta-50">{videos[0].title}</p>}
          </div>
        )}
      </section>

      {/* ------------------------------------------------ galeria */}
      {galeria.length > 0 && (
        <section className="bg-preto text-marfim-50">
          <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div>
              <p className="rotulo text-ouro-claro">O ateliê</p>
              <h2 className="mt-5 font-display text-4xl leading-[1.02] sm:text-6xl">
                Venha conhecer <span className="texto-ouro italic">o nosso espaço.</span>
              </h2>
              <p className="mt-6 max-w-md text-marfim-200">
                Provas com hora marcada, num ateliê pensado para experimentar com calma.
              </p>
              <div className="mt-8 max-w-md">
                <MapaDaLoja endereco={loja.address} latitude={loja.latitude} longitude={loja.longitude} mapsUrl={loja.mapsUrl} claro />
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/marcacao" className="btn btn-principal">
                  Marcar prova
                </Link>
                <Link href="/maquilhagem" className="btn btn-contorno-claro">
                  Maquilhagem com a nossa parceira
                </Link>
              </div>
            </div>
            <GaleriaSlides rotulo="Fotografias da DDRESS" imagens={galeria.map((g) => ({ url: g.url, titulo: g.title }))} />
          </div>
        </section>
      )}

      {/* ------------------------------------------------ contacto */}
      <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-8">
        <p className="rotulo text-tinta-50">Fale connosco</p>
        <p className="mt-6 font-display text-4xl sm:text-6xl">
          <a href={`tel:${loja.phone.replace(/\s/g, "")}`} className="num transition-colors hover:text-ouro-escuro">
            {loja.phone}
          </a>
        </p>
        <p className="mt-4 text-sm text-tinta-70">{loja.address}</p>
        <p className="mt-2 text-sm text-tinta-70">
          {loja.email && (
            <>
              <a href={`mailto:${loja.email}`} className="ligacao">
                {loja.email}
              </a>{" "}
              ·{" "}
            </>
          )}
          <a href="https://www.instagram.com/ddress_aluguer_de_vestidos/" target="_blank" rel="noreferrer" className="ligacao">
            @ddress_aluguer_de_vestidos
          </a>
        </p>
      </section>
    </>
  );
}
