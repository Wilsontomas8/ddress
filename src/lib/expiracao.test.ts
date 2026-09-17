/**
 * Regra de expiração das reservas sem prova.
 *
 * Uma reserva de aluguer que exige prova expira se não houver prova
 * marcada para, no mínimo, 24 horas antes do dia do levantamento.
 */

import { describe, expect, test } from "vitest";
import { avaliarReserva, limiteDaProva, momentoDaProva, type SituacaoDaReserva } from "./expiracao";
import { parseDay } from "./dates";

const LEVANTAMENTO = parseDay("2026-10-10"); // sábado
const HORAS = 24;

function situacao(extra: Partial<SituacaoDaReserva> = {}): SituacaoDaReserva {
  return {
    estadoDoPedido: "AGUARDA_PROVA",
    exigeProva: true,
    provaDispensada: false,
    levantamento: LEVANTAMENTO,
    provas: [],
    ...extra,
  };
}

/** Instante em hora de Luanda (UTC+1) */
const luanda = (iso: string) => new Date(`${iso}+01:00`);

describe("limite da prova", () => {
  test("é 24 horas antes da meia-noite de Luanda do dia do levantamento", () => {
    expect(limiteDaProva(LEVANTAMENTO, HORAS).toISOString()).toBe(luanda("2026-10-09T00:00:00").toISOString());
  });

  test("respeita as horas configuradas", () => {
    expect(limiteDaProva(LEVANTAMENTO, 48).toISOString()).toBe(luanda("2026-10-08T00:00:00").toISOString());
  });

  test("a hora da prova é lida em hora de Luanda", () => {
    expect(momentoDaProva(parseDay("2026-10-08"), "10:30").toISOString()).toBe(luanda("2026-10-08T10:30:00").toISOString());
  });
});

describe("expiração", () => {
  test("sem prova, ainda não expira antes do limite", () => {
    const a = avaliarReserva(situacao(), luanda("2026-10-08T23:59:00"), HORAS);
    expect(a.expirada).toBe(false);
    expect(a.horasRestantes).toBeGreaterThan(0);
  });

  test("sem prova, expira ao chegar ao limite", () => {
    expect(avaliarReserva(situacao(), luanda("2026-10-09T00:00:00"), HORAS).expirada).toBe(true);
  });

  test("com prova marcada antes do limite, não expira", () => {
    const s = situacao({ provas: [{ data: parseDay("2026-10-08"), hora: "15:00", status: "CONFIRMADA" }] });
    const a = avaliarReserva(s, luanda("2026-10-09T12:00:00"), HORAS);
    expect(a.temProvaValida).toBe(true);
    expect(a.expirada).toBe(false);
  });

  test("uma prova por confirmar também conta", () => {
    const s = situacao({ provas: [{ data: parseDay("2026-10-08"), hora: "09:00", status: "PENDENTE" }] });
    expect(avaliarReserva(s, luanda("2026-10-09T08:00:00"), HORAS).expirada).toBe(false);
  });

  test("prova marcada depois do limite não salva a reserva", () => {
    const s = situacao({ provas: [{ data: parseDay("2026-10-09"), hora: "10:00", status: "CONFIRMADA" }] });
    const a = avaliarReserva(s, luanda("2026-10-09T00:30:00"), HORAS);
    expect(a.temProvaValida).toBe(false);
    expect(a.expirada).toBe(true);
  });

  test("falta ou cancelamento não contam como prova", () => {
    for (const status of ["FALTOU", "CANCELADA"] as const) {
      const s = situacao({ provas: [{ data: parseDay("2026-10-07"), hora: "10:00", status }] });
      expect(avaliarReserva(s, luanda("2026-10-09T01:00:00"), HORAS).expirada).toBe(true);
    }
  });

  test("prova dispensada (fora de Luanda) nunca expira", () => {
    const a = avaliarReserva(situacao({ provaDispensada: true }), luanda("2026-10-09T20:00:00"), HORAS);
    expect(a.sujeita).toBe(false);
    expect(a.expirada).toBe(false);
  });

  test("peça que não exige prova nunca expira", () => {
    expect(avaliarReserva(situacao({ exigeProva: false }), luanda("2026-10-09T20:00:00"), HORAS).expirada).toBe(false);
  });

  test("pedido já confirmado pela loja não expira", () => {
    for (const estadoDoPedido of ["CONFIRMADO", "PAGO", "CANCELADO"] as const) {
      expect(avaliarReserva(situacao({ estadoDoPedido }), luanda("2026-10-09T20:00:00"), HORAS).expirada).toBe(false);
    }
  });
});
