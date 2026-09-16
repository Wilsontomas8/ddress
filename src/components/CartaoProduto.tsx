import Link from "next/link";
import { formatKz } from "@/lib/money";
import { formatNumericDate } from "@/lib/dates";
import type { ProdutoDaListagem } from "@/lib/catalogo";

export default function CartaoProduto({ produto }: { produto: ProdutoDaListagem }) {
  const soAluguer = produto.oferta === "ALUGUER";
  const temAluguer = produto.oferta === "ALUGUER" || produto.oferta === "AMBOS";
  const temVenda = produto.oferta === "VENDA" || produto.oferta === "AMBOS";

  const esgotadoVenda = temVenda && !produto.temStockVenda;
  const aluguerOcupado = temAluguer && !produto.temAluguerLivre;
  const indisponivel = (!temVenda || esgotadoVenda) && (!temAluguer || aluguerOcupado);

  return (
    <article className="group">
      <Link href={`/produto/${produto.slug}`} className="block">
        <div className="relative overflow-hidden bg-areia-100">
          {produto.imagem ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={produto.imagem}
              alt={produto.nome}
              width={900}
              height={1200}
              loading="lazy"
              className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="aspect-[3/4] w-full bg-areia-200" />
          )}

          <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
            {soAluguer && (
              <span className="selo bg-white/90 text-vinho">Só aluguer</span>
            )}
            {produto.oferta === "AMBOS" && (
              <span className="selo bg-white/90 text-tinta-70">Venda e aluguer</span>
            )}
            {produto.compareAtPrice && produto.salePrice && produto.compareAtPrice > produto.salePrice && (
              <span className="selo bg-vinho text-white">Promoção</span>
            )}
          </div>

          {indisponivel && (
            <div className="absolute inset-x-0 bottom-0 bg-tinta/85 px-3 py-2 text-center text-xs text-areia-100">
              {aluguerOcupado && produto.aluguerDisponivelDe
                ? `Reservada até ${formatNumericDate(produto.aluguerDisponivelDe)}`
                : "Indisponível de momento"}
            </div>
          )}
        </div>

        <div className="pt-3">
          <p className="text-[0.7rem] tracking-[0.1em] text-tinta-50 uppercase">
            {produto.categoria?.nome}
          </p>
          <h3 className="mt-1 font-display text-base leading-snug text-tinta">{produto.nome}</h3>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
            {temVenda && produto.salePrice && (
              <>
                <span className="text-tinta">{formatKz(produto.salePrice)}</span>
                {produto.compareAtPrice && produto.compareAtPrice > produto.salePrice && (
                  <span className="text-xs text-tinta-50 line-through">
                    {formatKz(produto.compareAtPrice)}
                  </span>
                )}
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
            <p className="mt-1 text-xs text-verde">Peças livres para reservar</p>
          )}
        </div>
      </Link>
    </article>
  );
}
