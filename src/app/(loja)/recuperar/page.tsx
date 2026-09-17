import FormularioRecuperar from "@/components/FormularioRecuperar";
import { getSessao } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Esqueci-me da palavra-passe" };

export default async function PaginaRecuperar() {
  const sessao = await getSessao();
  if (sessao) redirect("/conta");

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl">Nova palavra-passe</h1>
      <p className="mt-3 mb-8 text-sm text-tinta-70">
        Escreva o e-mail da sua conta. Enviamos-lhe uma ligação que serve uma vez e expira numa hora.
      </p>
      <FormularioRecuperar />
    </div>
  );
}
