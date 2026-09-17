import type {
  AppointmentStatus,
  ItemKind,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ReservationStatus,
  Role,
  Section,
} from "@/db/schema";

export const SECCOES: { value: Section; label: string; slug: string }[] = [
  { value: "HOMEM", label: "Homem", slug: "homem" },
  { value: "MULHER", label: "Mulher", slug: "mulher" },
  { value: "CRIANCA", label: "Criança", slug: "crianca" },
];

export function seccaoPorSlug(slug: string): Section | null {
  return SECCOES.find((s) => s.slug === slug)?.value ?? null;
}

export function slugDaSeccao(section: Section): string {
  return SECCOES.find((s) => s.value === section)?.slug ?? "";
}

export function labelSeccao(section: Section): string {
  return SECCOES.find((s) => s.value === section)?.label ?? String(section);
}

export const ESTADO_PEDIDO: Record<OrderStatus, { label: string; cor: string }> = {
  NOVO: { label: "Novo", cor: "tom-ouro" },
  RECEBIDO: { label: "Recebido", cor: "tom-azul" },
  AGUARDA_PROVA: { label: "Aguarda prova", cor: "tom-violeta" },
  CONFIRMADO: { label: "Confirmado", cor: "tom-azul" },
  PAGO: { label: "Pago", cor: "tom-verde" },
  PRONTO: { label: "Pronto para entrega", cor: "tom-verde" },
  ENTREGUE: { label: "Entregue", cor: "tom-neutro" },
  EM_ALUGUER: { label: "Em aluguer", cor: "tom-ouro" },
  DEVOLVIDO: { label: "Devolvido", cor: "tom-verde" },
  CONCLUIDO: { label: "Concluído", cor: "tom-neutro" },
  CANCELADO: { label: "Cancelado", cor: "tom-rubi" },
};

export const ESTADO_PAGAMENTO: Record<PaymentStatus, { label: string; cor: string }> = {
  PENDENTE: { label: "Por pagar", cor: "tom-ouro" },
  EM_VERIFICACAO: {
    label: "Comprovativo por validar",
    cor: "tom-azul",
  },
  PAGO: { label: "Pago", cor: "tom-verde" },
  PARCIAL: { label: "Parcial", cor: "tom-ouro" },
  REEMBOLSADO: { label: "Reembolsado", cor: "tom-neutro" },
  FALHADO: { label: "Falhado", cor: "tom-rubi" },
};

export const METODO_PAGAMENTO: Record<PaymentMethod, { label: string; descricao: string }> = {
  MULTICAIXA_EXPRESS: {
    label: "Multicaixa Express",
    descricao: "Pague pelo Multicaixa Express para o número da loja.",
  },
  TRANSFERENCIA: {
    label: "Transferência bancária",
    descricao: "Transfira e envie o comprovativo. O nosso funcionário valida.",
  },
  NA_ENTREGA: {
    label: "Pagamento na entrega ou no ateliê",
    descricao: "Paga quando levantar a peça ou na entrega.",
  },
  CARTAO: {
    label: "Cartão (Visa/Mastercard)",
    descricao: "Pagamento online imediato com cartão internacional.",
  },
};

export const ESTADO_MARCACAO: Record<AppointmentStatus, { label: string; cor: string }> = {
  PENDENTE: { label: "Por confirmar", cor: "tom-ouro" },
  CONFIRMADA: { label: "Confirmada", cor: "tom-verde" },
  REALIZADA: { label: "Realizada", cor: "tom-neutro" },
  FALTOU: { label: "Faltou", cor: "tom-rubi" },
  CANCELADA: { label: "Cancelada", cor: "tom-neutro" },
};

export const ESTADO_RESERVA: Record<ReservationStatus, string> = {
  PROVISORIA: "Provisória",
  CONFIRMADA: "Confirmada",
  ENTREGUE: "Peça entregue",
  EM_HIGIENIZACAO: "Em higienização",
  DEVOLVIDA: "Devolvida",
  CANCELADA: "Cancelada",
};

export const COR_RESERVA: Record<ReservationStatus, string> = {
  PROVISORIA: "tom-ouro",
  CONFIRMADA: "tom-azul",
  ENTREGUE: "tom-ouro",
  EM_HIGIENIZACAO: "tom-azul",
  DEVOLVIDA: "tom-verde",
  CANCELADA: "tom-neutro",
};

export const TIPO_ITEM: Record<ItemKind, string> = {
  VENDA: "Venda",
  ALUGUER: "Aluguer",
};

export const PAPEL: Record<Role, string> = {
  CLIENTE: "Cliente",
  FUNCIONARIO: "Funcionário",
  ADMIN: "Administrador",
  SUPORTE: "Suporte técnico",
  CONTABILISTA: "Contabilista",
  MOTORISTA: "Motorista",
};

export const RESIDENCIA: Record<"LUANDA" | "FORA_LUANDA", string> = {
  LUANDA: "Luanda",
  FORA_LUANDA: "Fora de Luanda",
};

/**
 * Transições de estado permitidas ao funcionário, por estado atual.
 * Mantém o fluxo coerente e evita saltos impossíveis.
 */
export const PROXIMOS_ESTADOS: Record<OrderStatus, OrderStatus[]> = {
  NOVO: ["RECEBIDO", "CANCELADO"],
  RECEBIDO: ["AGUARDA_PROVA", "CONFIRMADO", "CANCELADO"],
  AGUARDA_PROVA: ["CONFIRMADO", "CANCELADO"],
  CONFIRMADO: ["PAGO", "PRONTO", "CANCELADO"],
  PAGO: ["PRONTO", "CANCELADO"],
  PRONTO: ["ENTREGUE", "EM_ALUGUER", "CANCELADO"],
  ENTREGUE: ["CONCLUIDO"],
  EM_ALUGUER: ["DEVOLVIDO"],
  DEVOLVIDO: ["CONCLUIDO"],
  CONCLUIDO: [],
  CANCELADO: [],
};
