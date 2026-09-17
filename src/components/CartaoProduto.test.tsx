// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import CartaoProduto from "./CartaoProduto";
import type { ProdutoDaListagem } from "@/lib/catalogo";
import { parseDay } from "@/lib/dates";

function produto(extra: Partial<ProdutoDaListagem> = {}): ProdutoDaListagem {
  return {
    id: "1",
    nome: "Vestido de Gala Bordeaux",
    slug: "vestido-gala-bordeaux",
    seccao: "MULHER",
    categoria: { nome: "Vestidos de Gala", slug: "gala" },
    oferta: "ALUGUER",
    imagem: "/img/v.svg",
    salePrice: null,
    compareAtPrice: null,
    rentalDayPrice: 35000,
    rentalDeposit: 130000,
    requiresFitting: true,
    featured: true,
    temStockVenda: false,
    temAluguerLivre: true,
    aluguerDisponivelDe: null,
    ...extra,
  };
}

describe("ficha da peça na grelha", () => {
  test("liga à página da peça e mostra o preço por dia", () => {
    render(<CartaoProduto produto={produto()} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/produto/vestido-gala-bordeaux");
    expect(screen.getByText(/35.000 Kz\/dia|35 000 Kz\/dia/)).toBeInTheDocument();
    expect(screen.getByText("Só aluguer")).toBeInTheDocument();
    expect(screen.getByText("Livre para reservar")).toBeInTheDocument();
  });

  test("peça reservada mostra até quando", () => {
    render(<CartaoProduto produto={produto({ temAluguerLivre: false, aluguerDisponivelDe: parseDay("2026-10-12") })} />);
    expect(screen.getByText("Reservada até 12/10/2026")).toBeInTheDocument();
    expect(screen.queryByText("Livre para reservar")).not.toBeInTheDocument();
  });

  test("promoção mostra o selo e o preço riscado", () => {
    render(
      <CartaoProduto
        produto={produto({ oferta: "VENDA", salePrice: 189000, compareAtPrice: 215000, temStockVenda: true, rentalDayPrice: null })}
      />
    );
    expect(screen.getByText("Promoção")).toBeInTheDocument();
    expect(screen.getByText(/215.000 Kz|215 000 Kz/)).toHaveClass("line-through");
  });
});
