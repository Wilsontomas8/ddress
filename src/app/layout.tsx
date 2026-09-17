import type { Metadata } from "next";
import { ProvedorCarrinho } from "@/components/Carrinho";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DDRESS — aluguer e venda de vestidos",
    template: "%s · DDRESS",
  },
  description:
    "Loja de roupa em Luanda com peças para venda e para aluguer, secções de Mulher, Homem e Criança, e marcação de prova no ateliê.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-AO">
      <body>
        <ProvedorCarrinho>{children}</ProvedorCarrinho>
      </body>
    </html>
  );
}
