import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { collectionProducts, collections } from "@/db/schema";
import { exigirAcesso } from "@/lib/guarda";
import { mediaDe, pecasParaEscolher } from "@/lib/conteudos";
import { apagarColecao } from "@/app/admin/acoes-conteudos";
import CamposColecao from "@/components/admin/CamposColecao";
import EditorMedia from "@/components/admin/EditorMedia";
import BotaoAccao from "@/components/admin/BotaoAccao";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c] = await db.select({ name: collections.name }).from(collections).where(eq(collections.id, id));
  return { title: c ? `Colecção ${c.name}` : "Colecção" };
}

export default async function PaginaEditarColecao({ params }: { params: Promise<{ id: string }> }) {
  const eu = await exigirAcesso("colecoes");
  const { id } = await params;
  const [colecao] = await db.select().from(collections).where(eq(collections.id, id));
  if (!colecao) notFound();

  const [pecas, ligadas, media] = await Promise.all([
    pecasParaEscolher(),
    db.select({ id: collectionProducts.productId }).from(collectionProducts).where(eq(collectionProducts.collectionId, id)).orderBy(asc(collectionProducts.position)),
    mediaDe("COLECCAO", id),
  ]);

  return (
    <div className="max-w-5xl">
      <nav className="text-xs text-tinta-50">
        <Link href="/admin/colecoes" className="hover:text-ouro-escuro">
          Colecções
        </Link>
        <span className="mx-1.5">/</span>
        <span>{colecao.name}</span>
      </nav>

      <div className="mt-3 mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">{colecao.name}</h1>
        <div className="flex items-center gap-3">
          <Link href={`/colecoes/${colecao.slug}`} target="_blank" className="text-sm text-ouro-escuro hover:underline">
            Ver no site ↗
          </Link>
          {eu.podeEditar && (
            <BotaoAccao
              acao={apagarColecao.bind(null, colecao.id)}
              confirmar={`Apagar a colecção "${colecao.name}"? As peças continuam no catálogo.`}
              depois="/admin/colecoes"
              className="btn btn-perigo"
            >
              Apagar
            </BotaoAccao>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <EditorMedia ownerType="COLECCAO" ownerId={colecao.id} media={media} podeEditar={eu.podeEditar} />
        <CamposColecao colecao={colecao} pecas={pecas} marcadas={ligadas.map((l) => l.id)} podeEditar={eu.podeEditar} />
      </div>
    </div>
  );
}
