"use client";

/**
 * Carrinho do cliente.
 *
 * Fica guardado no navegador (localStorage) para não se perder quando a
 * pessoa fecha a página. Os preços aqui servem só para mostrar — no
 * checkout o servidor volta a calcular tudo a partir da base de dados,
 * para que ninguém possa alterar valores pelo browser.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ItemCarrinho = {
  /** Identificador da linha: peça + tipo + datas */
  chave: string;
  productId: string;
  productSlug: string;
  variantId: string;
  nome: string;
  variante: string;
  imagem: string | null;
  tipo: "VENDA" | "ALUGUER";
  quantidade: number;
  /** Venda: preço por unidade. Aluguer: preço de todo o período. */
  preco: number;
  caucao: number;
  /** Aluguer: "2026-09-18" */
  inicio?: string;
  fim?: string;
  dias?: number;
  exigeProva: boolean;
  /** Marcação de prova escolhida no site */
  prova?: { data: string; hora: string; fim: string };
};

type ContextoCarrinho = {
  itens: ItemCarrinho[];
  carregado: boolean;
  adicionar: (item: ItemCarrinho) => void;
  remover: (chave: string) => void;
  alterarQuantidade: (chave: string, quantidade: number) => void;
  limpar: () => void;
  totalPecas: number;
  subtotal: number;
  caucaoTotal: number;
};

const Contexto = createContext<ContextoCarrinho | null>(null);
const CHAVE = "wil-carrinho-v1";

export function ProvedorCarrinho({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CHAVE);
      if (guardado) setItens(JSON.parse(guardado));
    } catch {
      // localStorage pode estar bloqueado (navegação privada) — seguimos sem ele
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(itens));
    } catch {
      /* ignorado de propósito */
    }
  }, [itens, carregado]);

  const adicionar = useCallback((item: ItemCarrinho) => {
    setItens((atuais) => {
      const existente = atuais.find((i) => i.chave === item.chave);
      if (existente) {
        // Peças de aluguer são únicas: nunca se somam quantidades
        if (item.tipo === "ALUGUER") return atuais;
        return atuais.map((i) =>
          i.chave === item.chave ? { ...i, quantidade: i.quantidade + item.quantidade } : i
        );
      }
      return [...atuais, item];
    });
  }, []);

  const remover = useCallback((chave: string) => {
    setItens((atuais) => atuais.filter((i) => i.chave !== chave));
  }, []);

  const alterarQuantidade = useCallback((chave: string, quantidade: number) => {
    setItens((atuais) =>
      atuais
        .map((i) => (i.chave === chave ? { ...i, quantidade: Math.max(0, quantidade) } : i))
        .filter((i) => i.quantidade > 0)
    );
  }, []);

  const limpar = useCallback(() => setItens([]), []);

  const valor = useMemo<ContextoCarrinho>(() => {
    const totalPecas = itens.reduce((t, i) => t + i.quantidade, 0);
    const subtotal = itens.reduce((t, i) => t + i.preco * i.quantidade, 0);
    const caucaoTotal = itens.reduce((t, i) => t + i.caucao * i.quantidade, 0);
    return {
      itens,
      carregado,
      adicionar,
      remover,
      alterarQuantidade,
      limpar,
      totalPecas,
      subtotal,
      caucaoTotal,
    };
  }, [itens, carregado, adicionar, remover, alterarQuantidade, limpar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrinho(): ContextoCarrinho {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useCarrinho tem de ser usado dentro de <ProvedorCarrinho>.");
  return ctx;
}
