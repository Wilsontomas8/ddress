import Link from "next/link";
import { sairDaNewsletter } from "@/lib/espera";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sair da newsletter", robots: { index: false } };

export default async function PaginaSairDaNewsletter({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await sairDaNewsletter(token);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-display text-3xl">{r.ok ? "Saiu da lista" : "Ligação inválida"}</h1>
      <p className="mt-4 text-tinta-70">
        {r.ok
          ? `Não voltamos a escrever para ${r.email}. Pode inscrever-se de novo quando quiser, no fim de qualquer página.`
          : "Esta ligação já não serve. Se continua a receber e-mails nossos, fale connosco."}
      </p>
      <Link href="/" className="btn btn-contorno mt-8">
        Voltar à loja
      </Link>
    </div>
  );
}
