import Link from "next/link";
import PainelCarrinho from "@/components/PainelCarrinho";

export const metadata = { title: "Carrinho" };

export default function PaginaCarrinho() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav className="text-xs text-tinta-50">
        <Link href="/" className="hover:text-ouro-escuro">
          Início
        </Link>
        <span className="mx-1.5">/</span>
        <span>Carrinho</span>
      </nav>
      <h1 className="regua mt-3 font-display text-3xl">O seu carrinho</h1>
      <div className="mt-8">
        <PainelCarrinho />
      </div>
    </div>
  );
}
