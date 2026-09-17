import Link from "next/link";
import FormularioCheckout from "@/components/FormularioCheckout";
import { getUtilizador } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { listarParceiros } from "@/lib/conteudos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finalizar pedido" };

export default async function PaginaCheckout() {
  const [loja, utilizador, parceiros] = await Promise.all([getSettings(), getUtilizador(), listarParceiros({ servico: "MAQUILHAGEM" })]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav className="text-xs text-tinta-50">
        <Link href="/carrinho" className="hover:text-ouro-escuro">
          Carrinho
        </Link>
        <span className="mx-1.5">/</span>
        <span>Finalizar</span>
      </nav>
      <h1 className="regua mt-3 font-display text-3xl">Finalizar pedido</h1>
      <p className="mt-4 max-w-2xl text-sm text-tinta-70">
        Deixe os seus dados. Assim que enviar, o pedido entra no painel da loja e um
        funcionário nosso trata dele — confirma as peças, a prova, se for o caso, e o
        pagamento.
      </p>

      <div className="mt-8">
        <FormularioCheckout
          loja={{
            bankName: loja.bankName,
            accountHolder: loja.accountHolder,
            iban: loja.iban,
            multicaixaNumber: loja.multicaixaNumber,
            deliveryFee: loja.deliveryFee,
            address: loja.address,
            phone: loja.phone,
          }}
          cartaoAtivo={Boolean(process.env.STRIPE_SECRET_KEY)}
          parceiros={parceiros.map((x) => ({ id: x.id, name: x.name }))}
          utilizador={
            utilizador
              ? {
                  nome: utilizador.name,
                  email: utilizador.email,
                  telefone: utilizador.phone ?? "",
                  morada: utilizador.address ?? "",
                }
              : null
          }
        />
      </div>
    </div>
  );
}
