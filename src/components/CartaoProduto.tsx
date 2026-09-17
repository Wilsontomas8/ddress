import Link from "next/link";
import { formatKz } from "@/lib/money";
import { formatNumericDate } from "@/lib/dates";
import type { ProdutoDaListagem } from "@/lib/catalogo";

/**
 * Ficha da peça na grelha: a fotografia é a interface, sem moldura; por
 * baixo, só o essencial — categoria, nome, preço e disponibilidade.
 */
export default function CartaoProduto({ produto }: { produto: ProdutoDaListagem }) {
  const soAluguer = produto.oferta === "ALUGUER";
  const temAluguer = produto.oferta === "ALUGUER" || produto.oferta === "AMBOS";
  const temVenda = produto.oferta === "VENDA" || produto.oferta === "AMBOS";

  const esgotadoVenda = temVenda && !produto.temStockVenda;
  const aluguerOcupado = temAluguer && !produto.temAluguerLivre;
  const indisponivel = (!temVenda || esgotadoVenda) && (!temAluguer || aluguerOcupado);
  const promocao =
    !!produto.compareAtPrice && !!produto.salePrice && produto.compareAtPrice > produto.salePrice;

  return (
    <article className="group">
      <Link href={`/produto/${produto.slug}`} className="block">
        <div className="relative overflow-hidden bg-marfim-100">
          {produto.imagem ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={produto.imagem}
              alt={produto.nome}
              width={900}
              height={1200}
              loading="lazy"
              className={`aspect-[3/4] w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-marca)] group-hover:scale-[1.03] ${
                indisponivel ? "opacity-70" : ""
              }`}
            />
          ) : (
            <div className="aspect-[3/4] w-full bg-marfim-200" />
          )}

          <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
            {soAluguer && <span className="rotulo rounded-full bg-marfim-50/90 px-2.5 py-1 text-[0.625rem] text-tinta">Só aluguer</span>}
            {produto.oferta === "AMBOS" && (
              <span className="rotulo rounded-full bg-marfim-50/90 px-2.5 py-1 text-[0.625rem] text-tinta">Venda e aluguer</span>
            )}
            {promocao && <span className="rotulo rounded-full bg-ouro px-2.5 py-1 text-[0.625rem] text-preto">Promoção</span>}
          </div>

          {indisponivel && (
            <div className="absolute inset-x-3 bottom-3 rounded-full bg-preto/85 px-3 py-1.5 text-center text-xs text-marfim-100">
              {aluguerOcupado && produto.aluguerDisponivelDe
                ? `Reservada até ${formatNumericDate(produto.aluguerDisponivelDe)}`
                : "Indisponível de momento"}
            </div>
          )}
        </div>

        <div className="pt-4">
          <p className="rotulo text-[0.625rem] text-tinta-50">{produto.categoria?.nome}</p>
          <h3 className="mt-1.5 font-sans text-[0.95rem] leading-snug font-medium tracking-normal text-tinta underline-offset-4 group-hover:underline">
            {produto.nome}
          </h3>

          <div className="num mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
            {temVenda && produto.salePrice && (
              <>
                <span className="text-tinta">{formatKz(produto.salePrice)}</span>
                {promocao && <span className="text-xs text-tinta-50 line-through">{formatKz(produto.compareAtPrice)}</span>}
              </>
            )}
            {temAluguer && produto.rentalDayPrice && (
              <span className={temVenda ? "text-xs text-tinta-50" : "text-tinta"}>
                {temVenda ? "· aluguer " : ""}
                {formatKz(produto.rentalDayPrice)}/dia
              </span>
            )}
          </div>

          {temAluguer && produto.temAluguerLivre && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-verde">
              <span className="h-1.5 w-1.5 rounded-full bg-verde" aria-hidden="true" />
              Livre para reservar
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
