import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acompanhar pedido" };

/**
 * Consulta por referência, para quem comprou sem criar conta.
 * Pedimos o número do pedido e o telefone com que o pedido foi feito —
 * só com os dois é que mostramos o pedido.
 */
async function procurarPedido(formData: FormData) {
  "use server";

  const numero = String(formData.get("numero") ?? "").trim().toUpperCase();
  const telefone = String(formData.get("telefone") ?? "").replace(/[^\d]/g, "");

  if (!numero || telefone.length < 9) {
    redirect("/acompanhar?erro=dados");
  }

  const [pedido] = await db
    .select({ number: orders.number, phone: orders.customerPhone })
    .from(orders)
    .where(eq(orders.number, numero))
    .limit(1);

  // Comparamos só os dígitos: o cliente pode escrever com ou sem +244.
  const telefoneDoPedido = (pedido?.phone ?? "").replace(/[^\d]/g, "");
  const confere =
    !!pedido &&
    telefoneDoPedido.length >= 9 &&
    telefoneDoPedido.slice(-9) === telefone.slice(-9);

  if (!confere) {
    redirect("/acompanhar?erro=nao-encontrado");
  }

  redirect(`/pedido/${pedido.number}`);
}

export default async function PaginaAcompanhar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const erro = Array.isArray(sp.erro) ? sp.erro[0] : sp.erro;

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="regua font-display text-3xl">Acompanhar pedido</h1>
      <p className="mt-4 text-sm leading-relaxed text-tinta-70">
        Não precisa de conta. Escreva o número do pedido que lhe demos e o telefone com que
        fez o pedido.
      </p>

      <form action={procurarPedido} className="cartao mt-8 p-6">
        <label className="block">
          <span className="etiqueta">Número do pedido</span>
          <input
            className="campo"
            name="numero"
            required
            placeholder="DDR-2026-0001"
            autoComplete="off"
          />
        </label>

        <label className="mt-4 block">
          <span className="etiqueta">Telefone do pedido</span>
          <input
            className="campo"
            name="telefone"
            required
            inputMode="tel"
            placeholder="+244 9__ ___ ___"
            autoComplete="tel"
          />
        </label>

        {erro && (
          <p className="mt-4 border-l-2 border-rubi bg-marfim-100 px-3 py-2 text-sm">
            {erro === "dados"
              ? "Preencha o número do pedido e o telefone."
              : "Não encontrámos nenhum pedido com esses dados. Confirme o número e o telefone, ou ligue-nos."}
          </p>
        )}

        <button type="submit" className="btn btn-principal mt-6 w-full">
          Ver o meu pedido
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-tinta-70">
        Tem conta?{" "}
        <Link href="/conta" className="text-ouro-escuro underline underline-offset-4">
          Veja todos os seus pedidos
        </Link>
      </p>
    </div>
  );
}
