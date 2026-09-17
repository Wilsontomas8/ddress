import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/guarda";
import { pecasParaEscolher } from "@/lib/conteudos";
import CamposColecao from "@/components/admin/CamposColecao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova colecção" };

export default async function PaginaNovaColecao() {
  const eu = await exigirAcesso("colecoes");
  if (!eu.podeEditar) redirect("/admin/colecoes");
  const pecas = await pecasParaEscolher();

  return (
    <div className="max-w-5xl">
      <nav className="text-xs text-tinta-50">
        <Link href="/admin/colecoes" className="hover:text-ouro-escuro">
          Colecções
        </Link>
        <span className="mx-1.5">/</span>
        <span>Nova</span>
      </nav>
      <h1 className="mt-3 mb-8 font-display text-2xl">Nova colecção</h1>
      <CamposColecao pecas={pecas} marcadas={[]} podeEditar />
      <p className="mt-4 text-sm text-tinta-50">Depois de criar pode acrescentar vídeos e imagens.</p>
    </div>
  );
}
