import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, productImages, productVariants, products } from "@/db/schema";
import { estadoDasPecas } from "@/lib/catalogo";
import { formatKz } from "@/lib/money";
import { labelSeccao } from "@/lib/labels";
import { exigirAcesso } from "@/lib/guarda";

export const dynamic = "force-dynamic";
export const metadata = { title: "Peças" };

export default async function PaginaProdutosAdmin() {
  await exigirAcesso("produtos");

  const linhas = await db
    .select({
      p: products,
      categoria: categories.name,
      imagem: sql<string | null>`(
        SELECT url FROM ${productImages}
        WHERE ${productImages.productId} = ${products.id}
        ORDER BY ${productImages.position} LIMIT 1
      )`,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.section), asc(products.name));

  const variantes = await db.select().from(productVariants).where(eq(productVariants.active, true));

  const estados = await estadoDasPecas(
    variantes.filter((v) => v.rentalStock > 0).map((v) => v.id)
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Peças</h1>
          <p className="mt-1 text-sm text-tinta-70">
            {linhas.length} peças no catálogo · {variantes.length} tamanhos
          </p>
        </div>
        <Link href="/admin/produtos/nova" className="btn btn-principal">
          Nova peça
        </Link>
      </div>

      <div className="cartao mt-6 overflow-x-auto">
        <table className="tabela">
          <thead>
            <tr>
              <th></th>
              <th>Peça</th>
              <th>Secção</th>
              <th>Tipo</th>
              <th>Venda</th>
              <th>Aluguer</th>
              <th>Stock</th>
              <th>Aluguer livre</th>
              <th>Site</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ p, categoria, imagem }) => {
              const minhas = variantes.filter((v) => v.productId === p.id);
              const stockVenda = minhas.reduce((t, v) => t + v.saleStock, 0);
              const deAluguer = minhas.filter((v) => v.rentalStock > 0);
              const livres = deAluguer.filter((v) => estados.get(v.id)?.disponivel).length;

              return (
                <tr key={p.id}>
                  <td className="w-12">
                    {imagem && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={imagem}
                        alt=""
                        className="h-12 w-9 bg-marfim-100 object-cover"
                      />
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/admin/produtos/${p.id}`}
                      className="text-ouro-escuro hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="block text-xs text-tinta-50">{categoria}</span>
                  </td>
                  <td className="text-xs">{labelSeccao(p.section)}</td>
                  <td className="text-xs">
                    {p.offer === "AMBOS" ? "Venda e aluguer" : p.offer === "VENDA" ? "Venda" : "Aluguer"}
                    {p.requiresFitting && (
                      <span className="block text-[0.65rem] text-ouro-escuro">prova obrigatória</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">{p.salePrice ? formatKz(p.salePrice) : "—"}</td>
                  <td className="whitespace-nowrap">
                    {p.rentalDayPrice ? `${formatKz(p.rentalDayPrice)}/dia` : "—"}
                  </td>
                  <td>{stockVenda}</td>
                  <td>
                    {deAluguer.length === 0 ? (
                      "—"
                    ) : (
                      <span
                        className={livres === 0 ? "text-ouro-escuro" : "text-verde"}
                      >
                        {livres}/{deAluguer.length}
                      </span>
                    )}
                  </td>
                  <td>
                    {p.active ? (
                      <span className="selo tom-verde">Visível</span>
                    ) : (
                      <span className="selo bg-marfim-200 text-tinta-70">Escondida</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
