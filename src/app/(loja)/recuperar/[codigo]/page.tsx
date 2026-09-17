import Link from "next/link";
import FormularioRedefinir from "@/components/FormularioRedefinir";
import { codigoDeRecuperacaoServe } from "@/lib/contas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Definir nova palavra-passe", robots: { index: false } };

export default async function PaginaRedefinir({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const serve = await codigoDeRecuperacaoServe(codigo);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl">Definir palavra-passe</h1>
      {serve ? (
        <>
          <p className="mt-3 mb-8 text-sm text-tinta-70">Escolha a palavra-passe que vai passar a usar na DDRESS.</p>
          <FormularioRedefinir codigo={codigo} />
        </>
      ) : (
        <div className="cartao mt-8 p-8">
          <p className="text-tinta-70">Esta ligação já foi usada ou expirou.</p>
          <Link href="/recuperar" className="btn btn-principal mt-6">
            Pedir outra ligação
          </Link>
        </div>
      )}
    </div>
  );
}
