import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { productVariants, products } from "@/db/schema";
import FormularioMarcacao, { type ProdutoParaProva } from "@/components/FormularioMarcacao";
import { getUtilizador } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marcar prova no ateliê" };

export default async function PaginaMarcacao() {
  const [linhas, utilizador, loja] = await Promise.all([
    db
      .select({
        produtoId: products.id,
        nome: products.name,
        seccao: products.section,
        varianteId: productVariants.id,
        size: productVariants.size,
        color: productVariants.color,
      })
      .from(products)
      .innerJoin(productVariants, eq(productVariants.productId, products.id))
      .where(and(eq(products.active, true), eq(productVariants.active, true)))
      .orderBy(asc(products.section), asc(products.name), asc(productVariants.size)),
    getUtilizador(),
    getSettings(),
  ]);

  const mapa = new Map<string, ProdutoParaProva>();
  for (const l of linhas) {
    const atual = mapa.get(l.produtoId) ?? {
      id: l.produtoId,
      nome: l.nome,
      seccao: l.seccao,
      variantes: [],
    };
    atual.variantes.push({ id: l.varianteId, size: l.size, color: l.color });
    mapa.set(l.produtoId, atual);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="regua font-display text-3xl">Marcar prova no ateliê</h1>
      <p className="mt-4 text-sm leading-relaxed text-tinta-70">
        Experimente antes de comprar ou alugar. Estamos em {loja.address}, de segunda a sábado,
        das {loja.openHour} às {loja.closeHour}. Cada prova dura cerca de {loja.slotMinutes}{" "}
        minutos.
      </p>

      <div className="mt-10">
        <FormularioMarcacao
          produtos={[...mapa.values()]}
          utilizador={
            utilizador
              ? {
                  nome: utilizador.name,
                  email: utilizador.email,
                  telefone: utilizador.phone ?? "",
                }
              : null
          }
        />
      </div>
    </div>
  );
}
