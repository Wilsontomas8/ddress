/** Textos dos avisos — partilhados pelas páginas do painel */

export const ESTADO_AVISO: Record<string, { texto: string; cor: string }> = {
  PENDENTE: { texto: "Pendente", cor: "tom-ouro" },
  ENVIADA: { texto: "Enviado", cor: "tom-verde" },
  FALHADA: { texto: "Falhou", cor: "tom-rubi" },
  SEM_CONFIGURACAO: { texto: "E-mail por configurar", cor: "tom-neutro" },
};

export const CANAL_AVISO: Record<string, string> = {
  SITE: "no site",
  EMAIL: "e-mail",
  TELEGRAM: "Telegram",
};

export const PUBLICO_AVISO: Record<string, string> = {
  CLIENTE: "Cliente",
  LOJA: "Loja",
  PARCEIRO: "Parceira",
};
