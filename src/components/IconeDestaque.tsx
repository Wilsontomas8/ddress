import { Bike, Gem, Heart, Phone, Shirt, Sparkles, Star, type LucideIcon } from "lucide-react";

/** Ícones disponíveis para os destaques das páginas (escolhidos no painel) */
export const ICONES_DE_DESTAQUE: Record<string, { icone: LucideIcon; texto: string }> = {
  mulheres: { icone: Heart, texto: "Clientes" },
  pecas: { icone: Shirt, texto: "Peças" },
  recolha: { icone: Bike, texto: "Recolha / entrega" },
  telefone: { icone: Phone, texto: "Telefone" },
  qualidade: { icone: Gem, texto: "Qualidade" },
  brilho: { icone: Sparkles, texto: "Destaque" },
  estrela: { icone: Star, texto: "Estrela" },
};

export default function IconeDestaque({ nome, className }: { nome: string; className?: string }) {
  const Icone = (ICONES_DE_DESTAQUE[nome] ?? ICONES_DE_DESTAQUE.estrela).icone;
  return <Icone className={className} strokeWidth={1.4} aria-hidden="true" />;
}
