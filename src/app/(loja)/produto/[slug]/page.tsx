import Link from "next/link";
import { notFound } from "next/navigation";
import SelectorProduto from "@/components/SelectorProduto";
import CartaoProduto from "@/components/CartaoProduto";
import { getProduto, listarProdutos } from "@/lib/catalogo";
import { labelSeccao, slugDaSeccao } from "@/lib/labels";
import { toISODay } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await getProduto(slug);
  if (!dados) return { title: "Peça não encontrada" };
  return {
    title: dados.produto.name,
    description: dados.produto.description.slice(0, 160),
  };
}

export default async function PaginaProduto({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await getProduto(slug);
  if (!dados) notFound();

  const { produto, categoria, imagens, variantes } = dados;

  const relacionados = (
    await listarProdutos({ seccao: produto.section, categoriaSlug: categoria.slug, limite: 5 })
  )
    .filter((p) => p.id !== produto.id)
    .slice(0, 4);

  const seccaoSlug = slugDaSeccao(produto.section);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <nav className="text-xs text-tinta-50">
          <Link href="/" className="hover:text-ouro-escuro">
            Início
          </Link>
          <span className="mx-1.5">/</span>
          <Link href={`/loja/${seccaoSlug}`} className="hover:text-ouro-escuro">
            {labelSeccao(produto.section)}
          </Link>
          <span className="mx-1.5">/</span>
          <Link
            href={`/loja/${seccaoSlug}?categoria=${categoria.slug}`}
            className="hover:text-ouro-escuro"
          >
            {categoria.nome}
          </Link>
        </nav>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 lg:grid-cols-2 lg:gap-16">
        {/* --------------------------------------------------- imagens */}
        <div>
          <div className="bg-marfim-100">
            {imagens[0] ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imagens[0].url}
                alt={imagens[0].alt ?? produto.name}
                className="aspect-[3/4] w-full object-cover"
              />
            ) : (
              <div className="aspect-[3/4] w-full bg-marfim-200" />
            )}
          </div>
          {imagens.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {imagens.slice(1).map((im) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={im.id}
                  src={im.url}
                  alt={im.alt ?? produto.name}
                  className="aspect-square w-full bg-marfim-100 object-cover"
                />
              ))}
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- compra */}
        <div>
          <p className="text-[0.7rem] tracking-[0.12em] text-tinta-50 uppercase">
            {categoria.nome}
            {produto.brand ? ` · ${produto.brand}` : ""}
          </p>
          <h1 className="regua mt-2 font-display text-3xl sm:text-4xl">{produto.name}</h1>

          <p className="mt-6 text-[0.95rem] leading-relaxed text-tinta-70">
            {produto.description}
          </p>

          <div className="mt-8 border-t border-marfim-200 pt-8">
            <SelectorProduto
              produto={{
                id: produto.id,
                slug: produto.slug,
                nome: produto.name,
                oferta: produto.offer,
                salePrice: produto.salePrice,
                rentalDayPrice: produto.rentalDayPrice,
                rentalWeekendPrice: produto.rentalWeekendPrice,
                rentalDeposit: produto.rentalDeposit,
                minRentalDays: produto.minRentalDays,
                maxRentalDays: produto.maxRentalDays,
                requiresFitting: produto.requiresFitting,
              }}
              imagem={imagens[0]?.url ?? null}
              variantes={variantes.map((v) => ({
                id: v.id,
                size: v.size,
                color: v.color,
                saleStock: v.saleStock,
                rentalStock: v.rentalStock,
                aluguer: {
                  disponivel: v.aluguer.disponivel,
                  disponivelDe: toISODay(v.aluguer.disponivelDe),
                  ocupadaAte: v.aluguer.ocupadaAte ? toISODay(v.aluguer.ocupadaAte) : null,
                  exemplares: v.aluguer.exemplares,
                },
              }))}
            />
          </div>

          {produto.care && (
            <div className="mt-8 border-t border-marfim-200 pt-6">
              <p className="etiqueta">Conservação</p>
              <p className="text-sm text-tinta-70">{produto.care}</p>
            </div>
          )}

          <div className="mt-6 border-t border-marfim-200 pt-6 text-sm text-tinta-70">
            <p>
              Dúvidas sobre o tamanho?{" "}
              <Link href="/marcacao" className="text-ouro-escuro underline underline-offset-4">
                Marque uma prova no ateliê
              </Link>{" "}
              ou fale connosco.
            </p>
          </div>
        </div>
      </div>

      {relacionados.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-20">
          <h2 className="regua font-display text-2xl">Também em {categoria.nome}</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {relacionados.map((p) => (
              <CartaoProduto key={p.id} produto={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
