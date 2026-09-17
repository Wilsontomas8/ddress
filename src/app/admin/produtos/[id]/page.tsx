import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, productImages, productVariants, products } from "@/db/schema";
import FormularioProduto from "@/components/admin/FormularioProduto";
import EditorVariantes from "@/components/admin/EditorVariantes";
import { estadoDasPecas } from "@/lib/catalogo";
import { toISODay } from "@/lib/dates";
import { exigirAcesso } from "@/lib/guarda";

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
  await exigirAcesso("produtos");

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

  const estados = await estadoDasPecas(variantes.map((v) => v.id));

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
      </div>
    </div>
  );
}
