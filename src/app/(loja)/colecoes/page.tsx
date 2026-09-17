import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { listarColecoes } from "@/lib/conteudos";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Colecções",
  description: "As colecções DDRESS: vestidos de gala, noite e cerimónia para alugar ou comprar em Luanda.",
};

export default async function PaginaColecoes() {
  const colecoes = await listarColecoes();

  return (
    <>
      <section className="bg-preto text-marfim-50">
        <div className="mx-auto max-w-[90rem] px-4 pt-14 pb-14 sm:px-8 sm:pt-20">
          <p className="rotulo text-ouro-claro">DDRESS</p>
          <h1 className="mt-5 font-display text-5xl leading-none sm:text-7xl">
            Colecções<span className="texto-ouro italic">.</span>
          </h1>
          <p className="mt-6 max-w-xl text-marfim-200">
            Cada colecção tem as suas peças, vídeos e fotografias. Todas as peças podem ser compradas ou alugadas, e provadas no ateliê.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[90rem] px-4 py-14 sm:px-8 sm:py-20">
        {colecoes.length === 0 ? (
          <p className="py-16 text-center text-tinta-70">Ainda não há colecções publicadas.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {colecoes.map((c) => (
              <li key={c.id}>
                <Link href={`/colecoes/${c.slug}`} className="group relative block overflow-hidden bg-carvao">
                  {c.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.coverImage}
                      alt=""
                      loading="lazy"
                      className="aspect-[3/4] w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-marca)] group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="aspect-[3/4] w-full bg-carvao" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(10_10_10/0.85))]" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-marfim-50">
                    <div>
                      <h2 className="font-display text-4xl leading-none sm:text-5xl">{c.name}</h2>
                      {c.tagline && <p className="mt-3 max-w-xs text-sm text-marfim-100/85">{c.tagline}</p>}
                    </div>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-marfim-50/40 transition-colors group-hover:border-ouro-claro group-hover:bg-ouro-claro group-hover:text-preto">
                      <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
