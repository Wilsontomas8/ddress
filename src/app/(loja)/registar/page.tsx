import { redirect } from "next/navigation";
import FormularioRegistar from "@/components/FormularioRegistar";
import { getSessao } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Criar conta" };

export default async function PaginaRegistar() {
  const sessao = await getSessao();
  if (sessao) redirect("/conta");

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <FormularioRegistar />
    </div>
  );
}
