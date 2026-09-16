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
  { valor: "preco-asc", texto: "Preço: do mais baixo" },
  { valor: "preco-desc", texto: "Preço: do mais alto" },
];

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

  const titulo = seccao ? labelSeccao(seccao) : filtros.q ? `“${filtros.q}”` : "Toda a colecção";

  return (
    <>
      <section className="border-b border-areia-200 bg-areia-100">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <nav className="text-xs text-tinta-50">
            <Link href="/" className="hover:text-vinho">
              Início
            </Link>
            <span className="mx-1.5">/</span>
            <span>{titulo}</span>
          </nav>
          <h1 className="regua mt-3 font-display text-3xl sm:text-4xl">{titulo}</h1>
          <p className="mt-4 text-sm text-tinta-70">
            {produtos.length} {produtos.length === 1 ? "peça" : "peças"}
            {filtros.tipo === "aluguer" && " disponíveis para aluguer"}
            {filtros.tipo === "venda" && " à venda"}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl gap-10 px-4 py-10 lg:flex">
        {/* ------------------------------------------------- filtros */}
        <aside className="mb-8 shrink-0 lg:mb-0 lg:w-56">
          <div className="mb-8">
            <p className="etiqueta">Tipo</p>
            <ul className="space-y-1.5">
              {TIPOS.map((t) => {
                const ativo = (filtros.tipo ?? "") === t.valor;
                return (
                  <li key={t.valor || "tudo"}>
                    <Link
                      href={comFiltro({ tipo: t.valor })}
                      className={`text-sm ${ativo ? "text-vinho underline underline-offset-4" : "text-tinta-70 hover:text-vinho"}`}
                    >
                      {t.texto}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {categorias.length > 0 && (
            <div className="mb-8">
              <p className="etiqueta">Categoria</p>
              <ul className="space-y-1.5">
                <li>
                  <Link
                    href={comFiltro({ categoria: "" })}
                    className={`text-sm ${!filtros.categoria ? "text-vinho underline underline-offset-4" : "text-tinta-70 hover:text-vinho"}`}
                  >
                    Todas
                  </Link>
                </li>
                {categorias.map((c) => {
                  const ativo = filtros.categoria === c.slug;
                  return (
                    <li key={c.id}>
                      <Link
                        href={comFiltro({ categoria: c.slug })}
                        className={`text-sm ${ativo ? "text-vinho underline underline-offset-4" : "text-tinta-70 hover:text-vinho"}`}
                      >
                        {c.name}
                        {!seccao && (
                          <span className="ml-1 text-xs text-tinta-50">
                            ({labelSeccao(c.section)})
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div>
            <p className="etiqueta">Ordenar</p>
            <ul className="space-y-1.5">
              {ORDENS.map((o) => {
                const ativo = (filtros.ordenar ?? "") === o.valor;
                return (
                  <li key={o.valor || "recentes"}>
                    <Link
                      href={comFiltro({ ordenar: o.valor })}
                      className={`text-sm ${ativo ? "text-vinho underline underline-offset-4" : "text-tinta-70 hover:text-vinho"}`}
                    >
                      {o.texto}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* -------------------------------------------------- grelha */}
        <div className="flex-1">
          {produtos.length === 0 ? (
            <div className="cartao p-10 text-center">
              <p className="font-display text-xl">Não encontrámos peças com estes filtros.</p>
              <p className="mt-2 text-sm text-tinta-70">
                Experimente tirar um filtro ou procurar outra coisa.
              </p>
              <Link href={base} className="btn btn-contorno mt-6">
                Limpar filtros
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3">
              {produtos.map((p) => (
                <CartaoProduto key={p.id} produto={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
