import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, collectionProducts, productImages, productSuggestions, productVariants, products } from "@/db/schema";
import FormularioProduto from "@/components/admin/FormularioProduto";
import EditorVariantes from "@/components/admin/EditorVariantes";
import { estadoDasPecas } from "@/lib/catalogo";
import { toISODay } from "@/lib/dates";
import { exigirAcesso } from "@/lib/guarda";
import { listarColecoes, pecasParaEscolher } from "@/lib/conteudos";
import { guardarLigacoesDaPeca } from "@/app/admin/acoes-conteudos";
import FormularioAccao from "@/components/admin/FormularioAccao";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p] = await db.select({ name: products.name }).from(products).where(eq(products.id, id));
  return { title: p?.name ?? "Peça" };
}

export default async function PaginaEditarPeca({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const eu = await exigirAcesso("produtos");

  const { id } = await params;

  const [produto] = await db.select().from(products).where(eq(products.id, id));
  if (!produto) notFound();

  const [cats, variantes, imagens] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.position)),
    db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(asc(productVariants.size)),
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position)),
  ]);

  const [estados, sapatos, colecoes, sugeridos, naColecao] = await Promise.all([
    estadoDasPecas(variantes.map((v) => v.id)),
    pecasParaEscolher({ soSapatos: true }),
    listarColecoes({ incluirInactivas: true }),
    db.select({ id: productSuggestions.suggestedProductId }).from(productSuggestions).where(eq(productSuggestions.productId, id)),
    db.select({ id: collectionProducts.collectionId }).from(collectionProducts).where(eq(collectionProducts.productId, id)),
  ]);
  const idsSugeridos = sugeridos.map((x) => x.id);
  const idsColecoes = naColecao.map((x) => x.id);

  return (
    <div className="max-w-4xl">
      <nav className="text-xs text-tinta-50">
        <Link href="/admin/produtos" className="hover:text-ouro-escuro">
          Peças
        </Link>
        <span className="mx-1.5">/</span>
        <span>{produto.name}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">{produto.name}</h1>
        <Link
          href={`/produto/${produto.slug}`}
          target="_blank"
          className="text-sm text-ouro-escuro hover:underline"
        >
          Ver no site ↗
        </Link>
      </div>

      <div className="mt-8 space-y-8">
        <FormularioProduto
          produto={{
            id: produto.id,
            name: produto.name,
            description: produto.description,
            care: produto.care,
            brand: produto.brand,
            section: produto.section,
            categoryId: produto.categoryId,
            offer: produto.offer,
            salePrice: produto.salePrice,
            compareAtPrice: produto.compareAtPrice,
            rentalDayPrice: produto.rentalDayPrice,
            rentalWeekendPrice: produto.rentalWeekendPrice,
            rentalDeposit: produto.rentalDeposit,
            minRentalDays: produto.minRentalDays,
            maxRentalDays: produto.maxRentalDays,
            cleaningBufferDays: produto.cleaningBufferDays,
            requiresFitting: produto.requiresFitting,
            featured: produto.featured,
            active: produto.active,
          }}
          imagem={imagens[0]?.url ?? null}
          categorias={cats.map((c) => ({ id: c.id, name: c.name, section: c.section }))}
        />

        <EditorVariantes
          productId={produto.id}
          variantes={variantes.map((v) => {
            const e = estados.get(v.id);
            return {
              id: v.id,
              sku: v.sku,
              size: v.size,
              color: v.color,
              saleStock: v.saleStock,
              rentalStock: v.rentalStock,
              active: v.active,
              disponivel: e?.disponivel ?? false,
              disponivelDe: e ? toISODay(e.disponivelDe) : null,
            };
          })}
        />

        <FormularioAccao acao={guardarLigacoesDaPeca} podeEditar={eu.podeEditar} textoBotao="Guardar colecções e sapatos" className="cartao space-y-5 p-5">
          <input type="hidden" name="productId" value={produto.id} />
          <div>
            <h2 className="font-display text-lg">Colecções</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {colecoes.map((c) => (
                <li key={c.id}>
                  <label className="chip cursor-pointer has-[:checked]:border-ouro">
                    <input type="checkbox" name="colecoes" value={c.id} defaultChecked={idsColecoes.includes(c.id)} className="mr-1.5" />
                    {c.name}
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-lg">Sapatos sugeridos</h2>
            <p className="mt-1 text-sm text-tinta-70">Aparecem na página da peça, em “Complete o look”.</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {sapatos
                .filter((p) => p.id !== produto.id)
                .map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-3 border border-marfim-200 p-2 has-[:checked]:border-ouro">
                      <input type="checkbox" name="sugeridos" value={p.id} defaultChecked={idsSugeridos.includes(p.id)} />
                      {p.imagem && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imagem} alt="" className="h-10 w-10 object-cover" />
                      )}
                      <span className="text-sm">{p.name}</span>
                    </label>
                  </li>
                ))}
            </ul>
          </div>
        </FormularioAccao>
      </div>
    </div>
  );
}
