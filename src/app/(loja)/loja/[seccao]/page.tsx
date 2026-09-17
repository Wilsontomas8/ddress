import { notFound } from "next/navigation";
import ListagemLoja from "@/components/ListagemLoja";
import { labelSeccao, seccaoPorSlug } from "@/lib/labels";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ seccao: string }> }) {
  const { seccao } = await params;
  const s = seccaoPorSlug(seccao);
  return { title: s ? labelSeccao(s) : "Colecção" };
}

export default async function PaginaSeccao({
  params,
  searchParams,
}: {
  params: Promise<{ seccao: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ seccao: slug }, sp] = await Promise.all([params, searchParams]);
  const seccao = seccaoPorSlug(slug);
  if (!seccao) notFound();

  const texto = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

  return (
    <ListagemLoja
      seccao={seccao}
      filtros={{
        categoria: texto(sp.categoria),
        tipo: texto(sp.tipo),
        q: texto(sp.q),
        ordenar: texto(sp.ordenar),
      }}
    />
  );
}
