import "server-only";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { appointments, productVariants, rentalReservations } from "@/db/schema";
import {
  ESTADOS_QUE_BLOQUEIAM,
  calendarioDeProva,
  estadoDaPeca,
  type DiaDoCalendario,
  type EstadoDaPeca,
} from "./availability";
import { addDays, toISODay, today } from "./dates";
import { getConfigAtelie } from "./settings";

/** Marcações que ocupam cabine no ateliê */
const MARCACOES_ATIVAS = ["PENDENTE", "CONFIRMADA"] as const;

/**
 * Calendário de prova de uma peça concreta.
 * Junta duas coisas: onde a peça está (reservas de aluguer) e a agenda
 * do ateliê (cabines já ocupadas nesse horário).
 */
export async function agendaDaPeca(opts: {
  variantId?: string | null;
  desde?: Date;
  dias?: number;
}): Promise<{ peca: EstadoDaPeca | null; dias: DiaDoCalendario[] }> {
  const config = await getConfigAtelie();
  const desde = opts.desde ?? today();
  const quantos = opts.dias ?? 21;
  const ate = addDays(desde, quantos);

  let peca: EstadoDaPeca | null = null;

  if (opts.variantId) {
    const [variante] = await db
      .select({ rentalStock: productVariants.rentalStock })
      .from(productVariants)
      .where(eq(productVariants.id, opts.variantId));

    if (variante) {
      const reservas = await db
        .select({
          startDate: rentalReservations.startDate,
          blockUntil: rentalReservations.blockUntil,
          status: rentalReservations.status,
        })
        .from(rentalReservations)
        .where(
          and(
            eq(rentalReservations.variantId, opts.variantId),
            inArray(rentalReservations.status, ESTADOS_QUE_BLOQUEIAM)
          )
        );

      // Peças que só existem para venda não têm calendário de aluguer,
      // mas podem ser provadas na mesma — estão sempre no ateliê.
      peca =
        variante.rentalStock > 0
          ? estadoDaPeca(variante.rentalStock, reservas)
          : { disponivel: true, disponivelDe: today(), ocupadaAte: null, exemplares: 0 };
    }
  }

  const marcacoes = await db
    .select({
      date: appointments.date,
      startTime: appointments.startTime,
      variantId: appointments.variantId,
    })
    .from(appointments)
    .where(
      and(
        gte(appointments.date, desde),
        lte(appointments.date, ate),
        inArray(appointments.status, [...MARCACOES_ATIVAS])
      )
    );

  const dias = calendarioDeProva({
    config,
    // Só as peças de aluguer saem do ateliê; as de venda estão sempre cá.
    pecaDisponivelDe: peca && peca.exemplares > 0 ? peca.disponivelDe : null,
    variantId: opts.variantId ?? null,
    marcacoes: marcacoes.map((m) => ({
      data: toISODay(m.date),
      hora: m.startTime,
      variantId: m.variantId,
    })),
    desde,
    dias: quantos,
  });

  return { peca, dias };
}

/** Confirma que o horário continua livre no momento de gravar */
export async function horarioLivre(opts: {
  variantId?: string | null;
  data: Date;
  hora: string;
}): Promise<{ livre: boolean; motivo?: string }> {
  const config = await getConfigAtelie();

  const existentes = await db
    .select({ variantId: appointments.variantId })
    .from(appointments)
    .where(
      and(
        eq(appointments.date, opts.data),
        eq(appointments.startTime, opts.hora),
        inArray(appointments.status, [...MARCACOES_ATIVAS])
      )
    );

  if (opts.variantId && existentes.some((e) => e.variantId === opts.variantId)) {
    return { livre: false, motivo: "Esta peça já está a ser provada nesse horário." };
  }
  if (existentes.length >= config.slotCapacity) {
    return { livre: false, motivo: "Já não há cabine livre nesse horário." };
  }
  return { livre: true };
}

/** PRV-2026-0007 */
export function formatarCodigoMarcacao(numero: number): string {
  return `PRV-${new Date().getFullYear()}-${String(numero).padStart(4, "0")}`;
}

/**
 * Próximo número de marcação livre.
 * Devolvemos o número (e não já o código) para que um pedido com várias
 * provas possa numerá-las em sequência sem repetir códigos.
 */
export async function proximoNumeroMarcacao(): Promise<number> {
  const ano = new Date().getFullYear();
  const linhas = await db.select({ code: appointments.code }).from(appointments);
  const numeros = linhas
    .map((l) => l.code)
    .filter((c) => c.startsWith(`PRV-${ano}-`))
    .map((c) => parseInt(c.split("-")[2] ?? "0", 10))
    .filter((n) => !Number.isNaN(n));
  return (numeros.length ? Math.max(...numeros) : 0) + 1;
}

/** Gera o código visível da marcação: PRV-2026-0007 */
export async function proximoCodigoMarcacao(): Promise<string> {
  return formatarCodigoMarcacao(await proximoNumeroMarcacao());
}
