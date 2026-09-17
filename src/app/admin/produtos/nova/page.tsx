import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import FormularioProduto from "@/components/admin/FormularioProduto";
import { exigirAcesso } from "@/lib/guarda";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova peça" };

export default async function PaginaNovaPeca() {
  await exigirAcesso("produtos");

  const cats = await db.select().from(categories).orderBy(asc(categories.position));

  return (
    <div className="max-w-4xl">
      <nav className="text-xs text-tinta-50">
        <Link href="/admin/produtos" className="hover:text-ouro-escuro">
          Peças
        </Link>
        <span className="mx-1.5">/</span>
        <span>Nova</span>
      </nav>

      <h1 className="mt-3 font-display text-2xl">Nova peça</h1>
      <p className="mt-1 text-sm text-tinta-70">
        Depois de criar a peça, junte os tamanhos e o stock na página da peça.
      </p>

      <div className="mt-8">
        <FormularioProduto
          categorias={cats.map((c) => ({ id: c.id, name: c.name, section: c.section }))}
        />
      </div>
    </div>
  );
}
