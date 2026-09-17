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
  NOVO: { label: "Novo", cor: "bg-amber-100 text-amber-900 ring-amber-200" },
  RECEBIDO: { label: "Recebido", cor: "bg-sky-100 text-sky-900 ring-sky-200" },
  AGUARDA_PROVA: { label: "Aguarda prova", cor: "bg-violet-100 text-violet-900 ring-violet-200" },
  CONFIRMADO: { label: "Confirmado", cor: "bg-indigo-100 text-indigo-900 ring-indigo-200" },
  PAGO: { label: "Pago", cor: "bg-emerald-100 text-emerald-900 ring-emerald-200" },
  PRONTO: { label: "Pronto para entrega", cor: "bg-teal-100 text-teal-900 ring-teal-200" },
  ENTREGUE: { label: "Entregue", cor: "bg-stone-200 text-stone-800 ring-stone-300" },
  EM_ALUGUER: { label: "Em aluguer", cor: "bg-orange-100 text-orange-900 ring-orange-200" },
  DEVOLVIDO: { label: "Devolvido", cor: "bg-lime-100 text-lime-900 ring-lime-200" },
  CONCLUIDO: { label: "Concluído", cor: "bg-stone-200 text-stone-700 ring-stone-300" },
  CANCELADO: { label: "Cancelado", cor: "bg-rose-100 text-rose-900 ring-rose-200" },
};

export const ESTADO_PAGAMENTO: Record<PaymentStatus, { label: string; cor: string }> = {
  PENDENTE: { label: "Por pagar", cor: "bg-amber-100 text-amber-900 ring-amber-200" },
  EM_VERIFICACAO: {
    label: "Comprovativo por validar",
    cor: "bg-sky-100 text-sky-900 ring-sky-200",
  },
  PAGO: { label: "Pago", cor: "bg-emerald-100 text-emerald-900 ring-emerald-200" },
  PARCIAL: { label: "Parcial", cor: "bg-orange-100 text-orange-900 ring-orange-200" },
  REEMBOLSADO: { label: "Reembolsado", cor: "bg-stone-200 text-stone-700 ring-stone-300" },
  FALHADO: { label: "Falhado", cor: "bg-rose-100 text-rose-900 ring-rose-200" },
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
  PENDENTE: { label: "Por confirmar", cor: "bg-amber-100 text-amber-900 ring-amber-200" },
  CONFIRMADA: { label: "Confirmada", cor: "bg-emerald-100 text-emerald-900 ring-emerald-200" },
  REALIZADA: { label: "Realizada", cor: "bg-stone-200 text-stone-700 ring-stone-300" },
  FALTOU: { label: "Faltou", cor: "bg-rose-100 text-rose-900 ring-rose-200" },
  CANCELADA: { label: "Cancelada", cor: "bg-stone-200 text-stone-600 ring-stone-300" },
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
  PROVISORIA: "bg-amber-100 text-amber-900",
  CONFIRMADA: "bg-indigo-100 text-indigo-900",
  ENTREGUE: "bg-orange-100 text-orange-900",
  EM_HIGIENIZACAO: "bg-sky-100 text-sky-900",
  DEVOLVIDA: "bg-emerald-100 text-emerald-900",
  CANCELADA: "bg-stone-200 text-stone-700",
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
