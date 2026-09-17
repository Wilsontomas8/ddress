import { Suspense } from "react";
import { redirect } from "next/navigation";
import FormularioEntrar from "@/components/FormularioEntrar";
import { getSessao } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };

export default async function PaginaEntrar() {
  const sessao = await getSessao();
  if (sessao) redirect(sessao.role === "CLIENTE" ? "/conta" : "/admin");

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Suspense fallback={<p className="text-sm text-tinta-50">A carregar…</p>}>
        <FormularioEntrar />
      </Suspense>
    </div>
  );
}
