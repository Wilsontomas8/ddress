// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import HeroInicio from "./HeroInicio";
import type { Slide } from "@/conteudo/slides-inicio";

const slides: Slide[] = [
  { id: "a", imagem: "/a.jpg", rotulo: "Primeiro", titulo: ["Vista a peça", "certa."], texto: "Texto A", principal: { href: "/loja", texto: "Ver a colecção" } },
  { id: "b", imagem: "/b.jpg", rotulo: "Segundo", titulo: ["Prove antes.", "Leve depois."], texto: "Texto B", principal: { href: "/marcacao", texto: "Marcar prova" } },
];

beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
});
afterEach(() => vi.useRealTimers());

describe("vídeo da página inicial", () => {
  test("mostra o primeiro slide com o título e a acção", () => {
    render(<HeroInicio slides={slides} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Vista a peça certa.");
    expect(screen.getByRole("link", { name: "Ver a colecção" })).toHaveAttribute("href", "/loja");
  });

  test("avança sozinho ao fim de 8 segundos", () => {
    render(<HeroInicio slides={slides} />);
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Prove antes. Leve depois.");
  });

  test("pausado, não avança", () => {
    render(<HeroInicio slides={slides} />);
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Vista a peça certa.");
    expect(screen.getByRole("button", { name: "Retomar" })).toBeInTheDocument();
  });

  test("os indicadores levam ao slide escolhido e marcam o actual", () => {
    render(<HeroInicio slides={slides} />);
    const segundo = screen.getByRole("button", { name: /Slide 2 de 2/ });
    fireEvent.click(segundo);
    expect(segundo).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Marcar prova" })).toHaveAttribute("href", "/marcacao");
  });

  test("quem pede movimento reduzido começa em pausa", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    render(<HeroInicio slides={slides} />);
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Vista a peça certa.");
  });
});
