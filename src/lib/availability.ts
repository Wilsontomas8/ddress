/**
 * =====================================================================
 *  MOTOR DE DISPONIBILIDADE
 * =====================================================================
 *
 *  Regra de negócio (definida pelo cliente):
 *
 *   • Peça SEM reserva  → está disponível.
 *   • Peça COM reserva  → sai do catálogo de aluguer, não se pode
 *                          reservar por cima.
 *   • A peça volta a ficar disponível no dia seguinte ao fim da última
 *     reserva ativa, mais os dias de higienização do produto.
 *
 *  Quando uma peça tem mais do que um exemplar físico (rentalStock > 1),
 *  a mesma regra aplica-se por exemplar: só bloqueia quando todos os
 *  exemplares estão reservados naquele dia.
 *
 *  Reservas que já não bloqueiam nada: CANCELADA e DEVOLVIDA.
 * =====================================================================
 */

import type { ReservationStatus } from "@/db/schema";
import {
  addDays,
  inclusiveDays,
  minutesToTime,
  overlaps,
  timeToMinutes,
  toISODay,
  today,
} from "./dates";

/**
 * Estados de reserva que ocupam a peça no calendário.
 * EM_HIGIENIZACAO conta: a peça já voltou, mas ainda não pode sair —
 * fica presa até ao dia que o funcionário indicou.
 */
export const ESTADOS_QUE_BLOQUEIAM: ReservationStatus[] = [
  "PROVISORIA",
  "CONFIRMADA",
  "ENTREGUE",
  "EM_HIGIENIZACAO",
];

export type ReservaBloqueante = {
  startDate: Date;
  /** Fim da reserva + dias de higienização */
  blockUntil: Date;
  status: ReservationStatus;
};

export type EstadoDaPeca = {
  /** Livre hoje? */
  disponivel: boolean;
  /** Primeiro dia em que a peça pode voltar a ser levantada */
  disponivelDe: Date;
  /** Último dia ocupado (null se está livre) */
  ocupadaAte: Date | null;
  /** Quantos exemplares desta peça existem para aluguer */
  exemplares: number;
};

/**
 * Estado de uma peça: livre agora, ou ocupada até certo dia.
 * É isto que decide se a peça aparece como alugável no site.
 */
export function estadoDaPeca(
  rentalStock: number,
  reservas: ReservaBloqueante[]
): EstadoDaPeca {
  const hoje = today();
  const exemplares = Math.max(0, rentalStock);

  if (exemplares === 0) {
    return {
      disponivel: false,
      disponivelDe: hoje,
      ocupadaAte: null,
      exemplares: 0,
    };
  }

  // Reservas que ainda contam: por vencer (o dia de libertação ainda
  // não passou) e num estado que segura a peça.
  const ativas = reservas.filter(
    (r) =>
      ESTADOS_QUE_BLOQUEIAM.includes(r.status) &&
      r.blockUntil.getTime() >= hoje.getTime()
  );

  // Sobra exemplar sem reserva → a peça está disponível.
  if (ativas.length < exemplares) {
    return { disponivel: true, disponivelDe: hoje, ocupadaAte: null, exemplares };
  }

  // Todos os exemplares estão presos. A peça só volta ao catálogo
  // quando vencer a reserva que liberta o primeiro exemplar.
  const libertacoes = ativas
    .map((r) => r.blockUntil)
    .sort((a, b) => a.getTime() - b.getTime());

  const liberta = libertacoes[ativas.length - exemplares];

  return {
    disponivel: false,
    disponivelDe: addDays(liberta, 1),
    ocupadaAte: liberta,
    exemplares,
  };
}

/**
 * O período pedido pode ser reservado?
 * Só aceita se, em TODOS os dias do período (mais a higienização),
 * sobrar pelo menos um exemplar livre.
 */
export function periodoEstaLivre(
  rentalStock: number,
  cleaningBufferDays: number,
  reservas: ReservaBloqueante[],
  inicio: Date,
  fim: Date
): { livre: boolean; motivo?: string } {
  const exemplares = Math.max(0, rentalStock);
  if (exemplares === 0) {
    return { livre: false, motivo: "Esta peça não está disponível para aluguer." };
  }

  const hoje = today();
  if (inicio.getTime() < hoje.getTime()) {
    return { livre: false, motivo: "A data de levantamento já passou." };
  }
  if (fim.getTime() < inicio.getTime()) {
    return { livre: false, motivo: "A data de devolução é anterior ao levantamento." };
  }

  // Enquanto a peça tiver reserva ativa não aceita outra: só volta a
  // aceitar depois de essa reserva vencer (mais a higienização).
  const estado = estadoDaPeca(exemplares, reservas);

  if (!estado.disponivel && inicio.getTime() < estado.disponivelDe.getTime()) {
    return {
      livre: false,
      motivo: `Esta peça está reservada. Volta a estar disponível a partir de ${toISODay(
        estado.disponivelDe
      )}.`,
    };
  }

  // Guarda final: nunca deixar duas reservas tocarem-se no mesmo
  // exemplar, mesmo que os estados tenham sido editados à mão no painel.
  const bloqueioAte = addDays(fim, Math.max(0, cleaningBufferDays));
  const ativas = reservas.filter((r) => ESTADOS_QUE_BLOQUEIAM.includes(r.status));
  const sobrepostas = ativas.filter((r) =>
    overlaps(inicio, bloqueioAte, r.startDate, r.blockUntil)
  ).length;

  if (sobrepostas >= exemplares) {
    return { livre: false, motivo: "A peça já está reservada nesse período." };
  }

  return { livre: true };
}

// ---------------------------------------------------------------------
//  PREÇO DO ALUGUER
// ---------------------------------------------------------------------

export type OrcamentoAluguer = {
  dias: number;
  preco: number;
  caucao: number;
  /** Explicação legível: "Pacote fim-de-semana" ou "3 dias × 15.000 Kz" */
  detalhe: string;
  pacoteFimDeSemana: boolean;
};

export type PrecosAluguer = {
  rentalDayPrice: number | null;
  rentalWeekendPrice: number | null;
  rentalDeposit: number | null;
  minRentalDays: number;
  maxRentalDays: number;
};

/**
 * Calcula o valor do aluguer.
 * Se o produto tiver pacote de fim-de-semana e o período começar à
 * sexta-feira com 2 a 4 dias, aplica o pacote (normalmente mais barato).
 */
export function orcamentoAluguer(
  p: PrecosAluguer,
  inicio: Date,
  fim: Date
): OrcamentoAluguer | { erro: string } {
  const dias = inclusiveDays(inicio, fim);

  if (dias < 1) return { erro: "Período inválido." };
  if (dias < p.minRentalDays) {
    return { erro: `O aluguer mínimo é de ${p.minRentalDays} dia(s).` };
  }
  if (dias > p.maxRentalDays) {
    return { erro: `O aluguer máximo é de ${p.maxRentalDays} dias.` };
  }

  const caucao = p.rentalDeposit ?? 0;
  const comecaSexta = inicio.getUTCDay() === 5;
  const podePacote =
    p.rentalWeekendPrice !== null &&
    p.rentalWeekendPrice !== undefined &&
    comecaSexta &&
    dias >= 2 &&
    dias <= 4;

  if (podePacote) {
    const porDia = (p.rentalDayPrice ?? 0) * dias;
    const pacote = p.rentalWeekendPrice as number;
    if (porDia === 0 || pacote <= porDia) {
      return {
        dias,
        preco: pacote,
        caucao,
        detalhe: `Pacote fim-de-semana (${dias} dias)`,
        pacoteFimDeSemana: true,
      };
    }
  }

  if (!p.rentalDayPrice) return { erro: "Esta peça não tem preço de aluguer definido." };

  return {
    dias,
    preco: p.rentalDayPrice * dias,
    caucao,
    detalhe: `${dias} dia(s) × ${p.rentalDayPrice.toLocaleString("pt-AO")} Kz`,
    pacoteFimDeSemana: false,
  };
}

// ---------------------------------------------------------------------
//  CALENDÁRIO DE PROVA NO ATELIÊ  (por peça)
// ---------------------------------------------------------------------

export type Slot = {
  /** "10:00" */
  hora: string;
  fim: string;
  disponivel: boolean;
  /** Vagas restantes nesse horário */
  vagas: number;
  motivo?: string;
};

export type DiaDoCalendario = {
  /** "2026-09-18" */
  data: string;
  diaSemana: number;
  aberto: boolean;
  motivo?: string;
  slots: Slot[];
  vagasTotais: number;
};

export type ConfigAtelie = {
  openDays: number[];
  openHour: string;
  closeHour: string;
  slotMinutes: number;
  slotCapacity: number;
  minNoticeHours: number;
  bookingHorizonDays: number;
  closedDates: string[];
};

export type MarcacaoExistente = {
  /** "2026-09-18" */
  data: string;
  hora: string;
  /** Se for da mesma peça, essa peça não pode estar noutra prova à mesma hora */
  variantId: string | null;
};

function gerarHoras(config: ConfigAtelie): { hora: string; fim: string }[] {
  const inicio = timeToMinutes(config.openHour);
  const fecho = timeToMinutes(config.closeHour);
  const passo = Math.max(15, config.slotMinutes);
  const horas: { hora: string; fim: string }[] = [];
  for (let m = inicio; m + passo <= fecho; m += passo) {
    horas.push({ hora: minutesToTime(m), fim: minutesToTime(m + passo) });
  }
  return horas;
}

/**
 * Gera o calendário de provas PARA UMA PEÇA.
 *
 * Um dia só é oferecido quando:
 *   1. o ateliê está aberto (dia da semana e não é feriado);
 *   2. respeita a antecedência mínima e o horizonte de marcação;
 *   3. a peça está fisicamente no ateliê nesse dia — ou seja, a partir
 *      do dia em que fica livre segundo `estadoDaPeca`.
 *
 * Um horário só é oferecido quando ainda há cabines livres e a própria
 * peça não está a ser provada por outro cliente nesse horário.
 */
export function calendarioDeProva(opts: {
  config: ConfigAtelie;
  /** Primeiro dia em que a peça está no ateliê (de `estadoDaPeca`) */
  pecaDisponivelDe?: Date | null;
  variantId?: string | null;
  marcacoes: MarcacaoExistente[];
  /** Quantos dias gerar a partir de hoje */
  dias?: number;
  /** Data de início alternativa (para navegar no calendário) */
  desde?: Date;
}): DiaDoCalendario[] {
  const { config, marcacoes, variantId } = opts;
  const hoje = today();
  const inicio = opts.desde ?? hoje;
  const totalDias = opts.dias ?? config.bookingHorizonDays;

  const agora = new Date();
  const maisCedo = new Date(agora.getTime() + config.minNoticeHours * 3_600_000);
  const primeiroDiaUtil = new Date(
    Date.UTC(maisCedo.getUTCFullYear(), maisCedo.getUTCMonth(), maisCedo.getUTCDate())
  );
  const limite = addDays(hoje, config.bookingHorizonDays);
  const pecaLivreDe = opts.pecaDisponivelDe ?? hoje;

  const horas = gerarHoras(config);
  const resultado: DiaDoCalendario[] = [];

  for (let i = 0; i < totalDias; i++) {
    const dia = addDays(inicio, i);
    const iso = toISODay(dia);
    const diaSemana = dia.getUTCDay();

    let aberto = true;
    let motivo: string | undefined;

    if (!config.openDays.includes(diaSemana)) {
      aberto = false;
      motivo = "Ateliê encerrado";
    } else if (config.closedDates.includes(iso)) {
      aberto = false;
      motivo = "Feriado";
    } else if (dia.getTime() < primeiroDiaUtil.getTime()) {
      aberto = false;
      motivo = `Marcação com ${config.minNoticeHours}h de antecedência`;
    } else if (dia.getTime() > limite.getTime()) {
      aberto = false;
      motivo = "Fora do período de marcações";
    } else if (dia.getTime() < pecaLivreDe.getTime()) {
      aberto = false;
      motivo = "Peça alugada nesta data";
    }

    const slots: Slot[] = horas.map(({ hora, fim }) => {
      if (!aberto) return { hora, fim, disponivel: false, vagas: 0, motivo };

      const noMesmoHorario = marcacoes.filter((m) => m.data === iso && m.hora === hora);
      const ocupadas = noMesmoHorario.length;
      const pecaJaEmProva =
        !!variantId && noMesmoHorario.some((m) => m.variantId === variantId);

      const vagas = Math.max(0, config.slotCapacity - ocupadas);

      if (pecaJaEmProva) {
        return { hora, fim, disponivel: false, vagas: 0, motivo: "Peça já em prova" };
      }
      return {
        hora,
        fim,
        disponivel: vagas > 0,
        vagas,
        motivo: vagas > 0 ? undefined : "Sem cabine livre",
      };
    });

    resultado.push({
      data: iso,
      diaSemana,
      aberto: aberto && slots.some((s) => s.disponivel),
      motivo,
      slots,
      vagasTotais: slots.reduce((t, s) => t + (s.disponivel ? s.vagas : 0), 0),
    });
  }

  return resultado;
}
