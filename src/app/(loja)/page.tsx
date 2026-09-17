import Link from "next/link";
import CartaoProduto from "@/components/CartaoProduto";
import { listarProdutos } from "@/lib/catalogo";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const SECCOES = [
  {
    slug: "mulher",
    titulo: "Mulher",
    texto: "Vestidos de gala, alfaiataria e peças de dia.",
    imagem: "/img/mulher-vestido-bordeaux.svg",
  },
  {
    slug: "homem",
    titulo: "Homem",
    texto: "Fatos, smokings e camisas para cerimónia e trabalho.",
    imagem: "/img/homem-fato-marfim.svg",
  },
  {
    slug: "crianca",
    titulo: "Criança",
    texto: "Cerimónia e dia-a-dia, para comprar ou alugar.",
    imagem: "/img/crianca-fato-azul.svg",
  },
];

export default async function PaginaInicial() {
  const [destaques, loja] = await Promise.all([
    listarProdutos({ apenasDestaques: true, limite: 8 }),
    getSettings(),
  ]);

  return (
    <>
      {/* ------------------------------------------------------- hero */}
      <section className="relative isolate overflow-hidden bg-preto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/marca/ddress-logo-fundo-preto.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-preto via-preto/90 to-preto/40"
        />

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <p className="text-[0.7rem] tracking-[0.22em] text-ouro-claro uppercase">
              {loja.address}
            </p>
            <h1 className="mt-5 font-display text-4xl leading-[1.1] text-marfim-50 sm:text-5xl lg:text-6xl">
              Vista a peça certa.
              <br />
              <span className="texto-ouro">Compre-a ou alugue-a.</span>
            </h1>
            <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-marfim-200">
              Vestidos de cerimónia e peças do dia-a-dia para mulher, homem e criança. O que
              quiser levar para casa, compra. O que for só para um dia, aluga — e experimenta
              primeiro no ateliê, com hora marcada.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/loja" className="btn btn-principal">
                Ver a colecção
              </Link>
              <Link href="/loja?tipo=aluguer" className="btn btn-contorno-claro">
                Peças para alugar
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/mulher-vestido-dourado.svg"
              alt="Vestido de cerimónia dourado"
              className="aspect-[3/4] w-full object-cover ring-1 ring-ouro/25"
            />
            <div className="grid gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/homem-smoking-preto.svg"
                alt="Smoking preto de gala"
                className="aspect-square w-full object-cover ring-1 ring-ouro/25"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/crianca-vestido-dama.svg"
                alt="Vestido de dama de honor"
                className="aspect-square w-full object-cover ring-1 ring-ouro/25"
              />
            </div>
          </div>
        </div>

        <div className="filete-ouro" />
      </section>

      {/* --------------------------------------------------- secções */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="regua font-display text-2xl">Três secções, uma casa</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {SECCOES.map((s) => (
            <Link key={s.slug} href={`/loja/${s.slug}`} className="group block">
              <div className="overflow-hidden bg-marfim-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.imagem}
                  alt={s.titulo}
                  className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <h3 className="mt-3 font-display text-xl">{s.titulo}</h3>
              <p className="mt-1 text-sm text-tinta-70">{s.texto}</p>
              <span className="mt-2 inline-block text-sm text-ouro-escuro underline-offset-4 group-hover:underline">
                Ver peças
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------- como funciona */}
      <section className="bg-carvao text-marfim-100">
        <div className="filete-ouro" />
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="regua font-display text-2xl text-marfim-50">Como funciona o aluguer</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "01",
                t: "Escolhe a peça",
                d: "Cada peça mostra o seu próprio calendário. Se estiver reservada, vê o dia em que volta a estar livre.",
              },
              {
                n: "02",
                t: "Marca a prova",
                d: "Escolhe o dia e a hora para experimentar no ateliê. Só aparecem horas em que a peça está cá.",
              },
              {
                n: "03",
                t: "Confirmamos consigo",
                d: "O nosso funcionário recebe o pedido, confirma medidas e fecha o pagamento com a caução.",
              },
              {
                n: "04",
                t: "Leva e devolve",
                d: "Levanta a peça na data combinada. Na devolução, verificamos e libertamos a caução.",
              },
            ].map((p) => (
              <li key={p.n}>
                <p className="font-display text-3xl text-ouro">{p.n}</p>
                <h3 className="mt-2 font-display text-lg">{p.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-marfim-300">{p.d}</p>
              </li>
            ))}
          </ol>
          <Link href="/como-funciona" className="mt-8 inline-block text-sm text-ouro-claro underline-offset-4 hover:underline">
            Ver condições completas do aluguer
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------- destaques */}
      {destaques.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex items-end justify-between">
            <h2 className="regua font-display text-2xl">Em destaque</h2>
            <Link href="/loja" className="text-sm text-ouro-escuro underline-offset-4 hover:underline">
              Ver tudo
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {destaques.map((p) => (
              <CartaoProduto key={p.id} produto={p} />
            ))}
          </div>
        </section>
      )}

      {/* --------------------------------------------------- marcação */}
      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="flex flex-col items-start gap-6 border border-ouro/30 bg-carvao p-8 text-marfim-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl text-marfim-50">Quer experimentar antes de decidir?</h2>
            <p className="mt-2 max-w-xl text-sm text-marfim-300">
              Marque uma prova no ateliê. Escolhe a peça, o dia e a hora — e nós preparamos
              tudo para quando chegar.
            </p>
          </div>
          <Link href="/marcacao" className="btn btn-principal shrink-0">
            Marcar prova
          </Link>
        </div>
      </section>
    </>
  );
}
