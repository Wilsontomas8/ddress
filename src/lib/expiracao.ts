/**
 * =====================================================================
 *  EXPIRAÇÃO DAS RESERVAS SEM PROVA
 * =====================================================================
 *
 *  Regra definida pelo cliente:
 *
 *   Uma reserva de aluguer que exige prova no ateliê expira se não tiver
 *   nenhuma prova marcada para, no mínimo, 24 horas antes do dia do
 *   levantamento.
 *
 *  · As 24 horas são configuráveis em Definições (reservationExpiryHours).
 *  · Conta como prova válida uma marcação por confirmar, confirmada ou já
 *    realizada, cuja hora seja até ao limite. Faltas e cancelamentos não
 *    contam.
 *  · Reservas com prova dispensada (cliente fora de Luanda) nunca expiram
 *    por esta regra.
 *  · Só expiram pedidos que ainda não foram confirmados pela loja.
 *
 *  Funções puras, sem base de dados: usadas no servidor e no navegador.
 * =====================================================================
 */

import type { AppointmentStatus, OrderStatus } from "@/db/schema";

/** Luanda está em UTC+1 todo o ano (sem horário de verão). */
const FUSO_LUANDA_MS = 60 * 60 * 1000;

export const ESTADOS_DE_PEDIDO_QUE_EXPIRAM: OrderStatus[] = ["NOVO", "RECEBIDO", "AGUARDA_PROVA"];
export const ESTADOS_DE_PROVA_VALIDA: AppointmentStatus[] = ["PENDENTE", "CONFIRMADA", "REALIZADA"];

/** 00:00 de Luanda do dia civil guardado (Date à meia-noite UTC) */
export function inicioDoDia(dia: Date): Date {
  return new Date(dia.getTime() - FUSO_LUANDA_MS);
}

/** Dia civil + "HH:mm" em hora de Luanda → instante exacto */
export function momentoDaProva(dia: Date, hora: string): Date {
  const [h, m] = hora.split(":").map(Number);
  return new Date(inicioDoDia(dia).getTime() + (h * 60 + m) * 60_000);
}

/** Até quando a prova tem de acontecer para a reserva não expirar */
export function limiteDaProva(diaDeLevantamento: Date, horas: number): Date {
  return new Date(inicioDoDia(diaDeLevantamento).getTime() - horas * 3_600_000);
}

export type ProvaDaReserva = {
  data: Date;
  hora: string;
  status: AppointmentStatus;
};

export type SituacaoDaReserva = {
  estadoDoPedido: OrderStatus;
  exigeProva: boolean;
  provaDispensada: boolean;
  /** Primeiro dia de levantamento das peças de aluguer do pedido */
  levantamento: Date;
  provas: ProvaDaReserva[];
};

export type AvaliacaoDaReserva = {
  /** A regra aplica-se a este pedido? */
  sujeita: boolean;
  limite: Date;
  temProvaValida: boolean;
  expirada: boolean;
  /** Horas que faltam até ao limite (negativo se já passou) */
  horasRestantes: number;
};

export function avaliarReserva(
  s: SituacaoDaReserva,
  agora: Date,
  horas: number
): AvaliacaoDaReserva {
  const limite = limiteDaProva(s.levantamento, horas);
  const horasRestantes = (limite.getTime() - agora.getTime()) / 3_600_000;

  const sujeita =
    s.exigeProva && !s.provaDispensada && ESTADOS_DE_PEDIDO_QUE_EXPIRAM.includes(s.estadoDoPedido);

  const temProvaValida = s.provas.some(
    (p) =>
      ESTADOS_DE_PROVA_VALIDA.includes(p.status) &&
      momentoDaProva(p.data, p.hora).getTime() <= limite.getTime()
  );

  return {
    sujeita,
    limite,
    temProvaValida,
    expirada: sujeita && !temProvaValida && agora.getTime() >= limite.getTime(),
    horasRestantes,
  };
}
