/** Textos das solicitações — sem base de dados, servem o navegador e o servidor */

export const TIPOS_DE_SOLICITACAO = ["MAQUILHAGEM", "SAPATOS"] as const;
export type TipoDeSolicitacao = (typeof TIPOS_DE_SOLICITACAO)[number];

export const ESTADOS_DE_SOLICITACAO = ["NOVO", "EM_CONTACTO", "CONFIRMADO", "CONCLUIDO", "CANCELADO"] as const;
export type EstadoDeSolicitacao = (typeof ESTADOS_DE_SOLICITACAO)[number];

export const ROTULO_SOLICITACAO: Record<TipoDeSolicitacao, string> = {
  MAQUILHAGEM: "Maquilhagem",
  SAPATOS: "Sapatos",
};

export const ESTADO_SOLICITACAO: Record<EstadoDeSolicitacao, { label: string; cor: string }> = {
  NOVO: { label: "Nova", cor: "tom-ouro" },
  EM_CONTACTO: { label: "Em contacto", cor: "tom-azul" },
  CONFIRMADO: { label: "Confirmada", cor: "tom-verde" },
  CONCLUIDO: { label: "Concluída", cor: "tom-neutro" },
  CANCELADO: { label: "Cancelada", cor: "tom-rubi" },
};

/** Transições que a equipa pode fazer */
export const PROXIMOS_ESTADOS_SOLICITACAO: Record<EstadoDeSolicitacao, EstadoDeSolicitacao[]> = {
  NOVO: ["EM_CONTACTO", "CONFIRMADO", "CANCELADO"],
  EM_CONTACTO: ["CONFIRMADO", "CANCELADO"],
  CONFIRMADO: ["CONCLUIDO", "CANCELADO"],
  CONCLUIDO: [],
  CANCELADO: [],
};
