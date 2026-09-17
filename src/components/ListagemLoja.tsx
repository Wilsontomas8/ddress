import Link from "next/link";
import CartaoProduto from "@/components/CartaoProduto";
import { listarCategorias, listarProdutos } from "@/lib/catalogo";
import { labelSeccao, slugDaSeccao } from "@/lib/labels";
import type { Section } from "@/db/schema";

type Props = {
  seccao?: Section;
  filtros: {
    categoria?: string;
    tipo?: string;
    q?: string;
    ordenar?: string;
  };
};

const TIPOS = [
  { valor: "", texto: "Tudo" },
  { valor: "venda", texto: "Para comprar" },
  { valor: "aluguer", texto: "Para alugar" },
];

const ORDENS = [
  { valor: "", texto: "Mais recentes" },
  { valor: "preco-asc", texto: "Preço mais baixo" },
  { valor: "preco-desc", texto: "Preço mais alto" },
];

const SECCOES_NAV = [
  { href: "/loja", texto: "Tudo", seccao: undefined },
  { href: "/loja/mulher", texto: "Mulher", seccao: "MULHER" },
  { href: "/loja/homem", texto: "Homem", seccao: "HOMEM" },
  { href: "/loja/crianca", texto: "Criança", seccao: "CRIANCA" },
] as const;

export default async function ListagemLoja({ seccao, filtros }: Props) {
  const [produtos, categorias] = await Promise.all([
    listarProdutos({
      seccao,
      categoriaSlug: filtros.categoria,
      tipo: filtros.tipo,
      q: filtros.q,
      ordenar: filtros.ordenar,
    }),
    listarCategorias(seccao),
  ]);

  const base = seccao ? `/loja/${slugDaSeccao(seccao)}` : "/loja";

  function comFiltro(mudanca: Partial<Props["filtros"]>) {
    const p = new URLSearchParams();
    const juntos = { ...filtros, ...mudanca };
    if (juntos.categoria) p.set("categoria", juntos.categoria);
    if (juntos.tipo) p.set("tipo", juntos.tipo);
    if (juntos.q) p.set("q", juntos.q);
    if (juntos.ordenar) p.set("ordenar", juntos.ordenar);
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  }

  const titulo = seccao ? labelSeccao(seccao) : filtros.q ? `“${filtros.q}”` : "A colecção";
  const temFiltros = !!(filtros.categoria || filtros.tipo || filtros.q || filtros.ordenar);

  return (
    <>
      {/* ------------------------------------------------ cabeçalho escuro */}
      <section className="bg-preto text-marfim-50">
        <div className="mx-auto max-w-[90rem] px-4 pt-14 pb-10 sm:px-8 sm:pt-20">
          <nav aria-label="Caminho" className="rotulo text-[0.625rem] text-marfim-400">
            <Link href="/" className="hover:text-ouro-claro">
              Início
            </Link>
            <span className="mx-2">/</span>
            <span className="text-marfim-200">{titulo}</span>
          </nav>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <h1 className="font-display text-5xl leading-none sm:text-7xl">
              {titulo}
              <span className="texto-ouro italic">.</span>
            </h1>
            <p className="num text-sm text-marfim-300">
              {produtos.length} {produtos.length === 1 ? "peça" : "peças"}
              {filtros.tipo === "aluguer" && " para alugar"}
              {filtros.tipo === "venda" && " à venda"}
            </p>
          </div>

          <nav aria-label="Secções" className="sem-barra mt-10 -mb-px flex gap-8 overflow-x-auto border-b border-white/10">
            {SECCOES_NAV.map((s) => {
              const ativo = s.seccao === seccao;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`rotulo border-b pb-4 whitespace-nowrap transition-colors ${
                    ativo ? "border-ouro-claro text-ouro-claro" : "border-transparent text-marfim-300 hover:text-marfim-50"
                  }`}
                >
                  {s.texto}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      {/* ------------------------------------------------ filtros */}
      <div className="sticky top-16 z-30 border-b border-marfim-200 bg-marfim-50/95 backdrop-blur sm:top-20">
        <div className="sem-barra mx-auto flex max-w-[90rem] items-center gap-2 overflow-x-auto px-4 py-3 sm:px-8">
          {TIPOS.map((t) => (
            <Link
              key={t.valor || "tudo"}
              href={comFiltro({ tipo: t.valor })}
              className="chip"
              aria-current={(filtros.tipo ?? "") === t.valor ? "true" : undefined}
            >
              {t.texto}
            </Link>
          ))}

          {categorias.length > 0 && <span className="mx-2 h-5 w-px shrink-0 bg-marfim-300" aria-hidden="true" />}

          {categorias.map((c) => (
            <Link
              key={c.id}
              href={comFiltro({ categoria: filtros.categoria === c.slug ? "" : c.slug })}
              className="chip"
              aria-current={filtros.categoria === c.slug ? "true" : undefined}
            >
              {c.name}
              {!seccao && <span className="text-xs opacity-60">{labelSeccao(c.section)}</span>}
            </Link>
          ))}

          <span className="ml-auto" />
          {ORDENS.map((o) => (
            <Link
              key={o.valor || "recentes"}
              href={comFiltro({ ordenar: o.valor })}
              className={`shrink-0 px-2 text-xs whitespace-nowrap underline-offset-4 ${
                (filtros.ordenar ?? "") === o.valor ? "text-tinta underline" : "text-tinta-50 hover:text-tinta"
              }`}
            >
              {o.texto}
            </Link>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ grelha */}
      <div className="mx-auto max-w-[90rem] px-4 py-12 sm:px-8 sm:py-16">
        {produtos.length === 0 ? (
          <div className="mx-auto max-w-lg py-16 text-center">
            <p className="font-display text-3xl">Não encontrámos peças com estes filtros.</p>
            <p className="mt-3 text-sm text-tinta-70">Experimente tirar um filtro ou procurar outra coisa.</p>
            {temFiltros && (
              <Link href={base} className="btn btn-escuro mt-8">
                Limpar filtros
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
            {produtos.map((p) => (
              <CartaoProduto key={p.id} produto={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
