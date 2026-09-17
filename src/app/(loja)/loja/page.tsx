import ListagemLoja from "@/components/ListagemLoja";

export const dynamic = "force-dynamic";

export const metadata = { title: "Colecção" };

export default async function PaginaLoja({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const texto = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

  return (
    <ListagemLoja
      filtros={{
        categoria: texto(sp.categoria),
        tipo: texto(sp.tipo),
        q: texto(sp.q),
        ordenar: texto(sp.ordenar),
      }}
    />
  );
}
