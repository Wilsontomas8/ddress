import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { collectionProducts, mediaItems } from "@/db/schema";
import { exigirAcesso } from "@/lib/guarda";
import { listarColecoes } from "@/lib/conteudos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Colecções" };

export default async function PaginaColecoesAdmin() {
  const eu = await exigirAcesso("colecoes");
  const [colecoes, pecas, media] = await Promise.all([
    listarColecoes({ incluirInactivas: true }),
    db.select({ id: collectionProducts.collectionId, n: count() }).from(collectionProducts).groupBy(collectionProducts.collectionId),
    db.select({ id: mediaItems.ownerId, n: count() }).from(mediaItems).where(eq(mediaItems.ownerType, "COLECCAO")).groupBy(mediaItems.ownerId),
  ]);
  const nPecas = new Map(pecas.map((p) => [p.id, p.n]));
  const nMedia = new Map(media.map((m) => [m.id, m.n]));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Colecções</h1>
          <p className="mt-1 text-sm text-tinta-70">Cada colecção tem a sua página no site, com vídeos e as peças para alugar e comprar.</p>
        </div>
        {eu.podeEditar && (
          <Link href="/admin/colecoes/nova" className="btn btn-principal">
            Nova colecção
          </Link>
        )}
      </div>

      {colecoes.length === 0 ? (
        <p className="cartao mt-6 p-8 text-center text-sm text-tinta-70">Ainda não há colecções.</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {colecoes.map((c) => (
            <li key={c.id} className="cartao overflow-hidden">
              <Link href={`/admin/colecoes/${c.id}`} className="block">
                <div className="aspect-[16/10] bg-marfim-100">
                  {c.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.coverImage} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-xl">{c.name}</h2>
                    <span className={`selo ${c.active ? "tom-verde" : "tom-neutro"}`}>{c.active ? "Visível" : "Escondida"}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-tinta-70">{c.tagline}</p>
                  <p className="num mt-3 text-xs text-tinta-50">
                    {nPecas.get(c.id) ?? 0} peças · {(nMedia.get(c.id) ?? 0) + (c.heroVideo ? 1 : 0)} vídeos/imagens · /colecoes/{c.slug}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
