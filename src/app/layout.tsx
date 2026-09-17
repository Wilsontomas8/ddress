import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/bodoni-moda/wght.css";
import "@fontsource-variable/bodoni-moda/wght-italic.css";
import { ProvedorCarrinho } from "@/components/Carrinho";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DDRESS — venda e aluguer de vestidos em Luanda",
    template: "%s · DDRESS",
  },
  description:
    "Vestidos de cerimónia e peças do dia-a-dia para mulher, homem e criança. Compre ou alugue, com prova no ateliê em Luanda.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-AO">
      <body>
        <a href="#conteudo" className="saltar-conteudo">
          Saltar para o conteúdo
        </a>
        <ProvedorCarrinho>{children}</ProvedorCarrinho>
      </body>
    </html>
  );
}
