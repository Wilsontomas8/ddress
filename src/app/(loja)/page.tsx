import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import CartaoProduto from "@/components/CartaoProduto";
import HeroInicio from "@/components/HeroInicio";
import { listarProdutos } from "@/lib/catalogo";
import { paginaInicial } from "@/lib/conteudos";

export const dynamic = "force-dynamic";

const SECCOES = [
  {
    slug: "mulher",
    titulo: "Mulher",
    texto: "Gala, cerimónia, alfaiataria e dia-a-dia.",
    imagem: "/img/mulher-vestido-bordeaux.svg",
  },
  {
    slug: "homem",
    titulo: "Homem",
    texto: "Fatos e smokings para o grande dia.",
    imagem: "/img/homem-smoking-preto.svg",
  },
  {
    slug: "crianca",
    titulo: "Criança",
    texto: "Pajens, damas de honor e festas.",
    imagem: "/img/crianca-vestido-dama.svg",
  },
];

const PASSOS = [
  {
    n: "01",
    t: "Escolha a peça",
    d: "Cada peça mostra o seu calendário. Se estiver reservada, vê o dia em que volta a estar livre.",
  },
  {
    n: "02",
    t: "Marque a prova",
    d: "Escolha o dia e a hora para experimentar no ateliê. Só aparecem as horas em que a peça está cá.",
  },
  {
    n: "03",
    t: "Confirmamos consigo",
    d: "Recebemos o pedido, confirmamos medidas e fechamos o pagamento com a caução.",
  },
  {
    n: "04",
    t: "Leve e devolva",
    d: "Levante a peça na data combinada. Na devolução verificamos e devolvemos a caução.",
  },
];

export default async function PaginaInicial() {
  const [destaques, inicio] = await Promise.all([listarProdutos({ apenasDestaques: true, limite: 8 }), paginaInicial()]);

  return (
    <>
      <HeroInicio slides={inicio.slides} video={inicio.video} />

      {/* ------------------------------------------------ garantias */}
      <section aria-label="O que a DDRESS garante" className="border-b border-marfim-200">
        <ul className="mx-auto grid max-w-[90rem] divide-marfim-200 px-4 sm:grid-cols-3 sm:divide-x sm:px-8">
          {[
            ["Prova no ateliê", "Experimente antes, com hora marcada"],
            ["Aluguer por dia", "Ou em pacote de fim-de-semana"],
            ["Entregas em Luanda", "Ou levantamento no ateliê"],
          ].map(([t, d]) => (
            <li key={t} className="flex items-baseline gap-3 py-5 sm:justify-center sm:px-6">
              <span className="rotulo text-ouro-escuro">{t}</span>
              <span className="text-sm text-tinta-70">{d}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------ secções */}
      <section className="mx-auto max-w-[90rem] px-4 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="rotulo text-tinta-50">A colecção</p>
            <h2 className="mt-4 font-display text-4xl leading-none sm:text-6xl">
              Três secções, <span className="italic">uma casa.</span>
            </h2>
          </div>
          <Link href="/loja" className="group inline-flex items-center gap-2 text-sm font-medium">
            Ver toda a colecção
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {SECCOES.map((s) => (
            <Link key={s.slug} href={`/loja/${s.slug}`} className="group relative block overflow-hidden bg-marfim-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.imagem}
                alt=""
                className="aspect-[3/4] w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-marca)] group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgb(10_10_10/0.75))]" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-marfim-50">
                <div>
                  <h3 className="font-display text-4xl leading-none">{s.titulo}</h3>
                  <p className="mt-2 text-sm text-marfim-100/80">{s.texto}</p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-marfim-50/40 transition-colors group-hover:border-ouro-claro group-hover:bg-ouro-claro group-hover:text-preto">
                  <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ como funciona: faixa dividida */}
      <section className="grid bg-preto text-marfim-100 lg:grid-cols-2">
        <div className="px-4 py-20 sm:px-8 sm:py-28 lg:px-16 xl:px-24">
          <p className="rotulo text-ouro-claro">Como funciona o aluguer</p>
          <h2 className="mt-5 max-w-lg font-display text-4xl leading-[1.02] text-marfim-50 sm:text-6xl">
            O aluguer, <span className="texto-ouro italic">peça a peça.</span>
          </h2>
          <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {PASSOS.map((p) => (
              <li key={p.n} className="border-t border-white/10 pt-5">
                <p className="num font-display text-2xl text-ouro">{p.n}</p>
                <h3 className="mt-3 font-sans text-base font-semibold tracking-normal text-marfim-50">{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-marfim-300">{p.d}</p>
              </li>
            ))}
          </ol>
          <Link href="/como-funciona" className="btn btn-contorno-claro mt-12">
            Condições completas
          </Link>
        </div>
        <div className="relative min-h-[26rem] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/mulher-vestido-dourado.svg"
            alt="Vestido de cerimónia dourado"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </section>

      {/* ------------------------------------------------ destaques */}
      {destaques.length > 0 && (
        <section className="mx-auto max-w-[90rem] px-4 py-20 sm:px-8 sm:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="rotulo text-tinta-50">Em destaque</p>
              <h2 className="mt-4 font-display text-4xl leading-none sm:text-6xl">
                Escolhidas <span className="italic">para a estação.</span>
              </h2>
            </div>
            <Link href="/loja" className="group inline-flex items-center gap-2 text-sm font-medium">
              Ver tudo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
            {destaques.map((p) => (
              <CartaoProduto key={p.id} produto={p} />
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ fim-de-semana: o único bloco em ouro */}
      <section className="mx-auto max-w-[90rem] px-4 sm:px-8">
        <div className="grid items-center gap-8 bg-[linear-gradient(135deg,var(--color-ouro-claro),var(--color-ouro)_55%,#a9852a)] px-6 py-12 text-preto sm:px-12 lg:grid-cols-[1.4fr_1fr] lg:py-16">
          <div>
            <p className="rotulo">Pacote de fim-de-semana</p>
            <h2 className="mt-4 font-display text-4xl leading-[1.02] sm:text-5xl">
              De sexta a segunda, <span className="italic">um só valor.</span>
            </h2>
            <p className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-preto/80">
              Nas peças com pacote, o aluguer que começa à sexta-feira e dura até quatro dias custa o
              valor de fim-de-semana — sempre que sair mais barato do que pagar dia a dia.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/loja?tipo=aluguer" className="btn btn-escuro">
              Ver peças para alugar
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ prova no ateliê */}
      <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-8 sm:py-32">
        <p className="rotulo text-tinta-50">Ateliê DDRESS</p>
        <h2 className="mt-6 font-display text-4xl leading-[1.05] sm:text-6xl">
          Quer experimentar <span className="italic">antes de decidir?</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-[0.95rem] leading-relaxed text-tinta-70">
          Escolha a peça, o dia e a hora. Preparamos tudo para quando chegar — e, se for alugar,
          a prova fica ligada à sua reserva.
        </p>
        <Link href="/marcacao" className="btn btn-escuro mt-10">
          Marcar prova no ateliê
        </Link>
      </section>
    </>
  );
}
