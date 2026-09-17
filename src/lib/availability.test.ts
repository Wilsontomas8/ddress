/**
 * Testes do motor de disponibilidade.
 *
 *   npm test
 *
 * Cobrem a regra de negócio da loja:
 *   peça sem reserva → disponível
 *   peça com reserva → fora do catálogo
 *   peça volta a ficar disponível depois de a última reserva vencer
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calendarioDeProva,
  estadoDaPeca,
  orcamentoAluguer,
  periodoEstaLivre,
  type ConfigAtelie,
  type ReservaBloqueante,
} from "./availability";
import { addDays, parseDay, toISODay, today } from "./dates";

const hoje = today();

function reserva(
  inicioOffset: number,
  fimOffset: number,
  status: ReservaBloqueante["status"] = "CONFIRMADA"
): ReservaBloqueante {
  return {
    startDate: addDays(hoje, inicioOffset),
    blockUntil: addDays(hoje, fimOffset),
    status,
  };
}

// ------------------------------------------------- estado da peça

test("peça sem reserva está disponível", () => {
  const e = estadoDaPeca(1, []);
  assert.equal(e.disponivel, true);
  assert.equal(toISODay(e.disponivelDe), toISODay(hoje));
  assert.equal(e.ocupadaAte, null);
});

test("peça com reserva ativa sai do catálogo", () => {
  const e = estadoDaPeca(1, [reserva(3, 10)]);
  assert.equal(e.disponivel, false);
  assert.equal(toISODay(e.ocupadaAte!), toISODay(addDays(hoje, 10)));
});

test("peça volta a ficar disponível no dia seguinte ao fim da reserva", () => {
  const e = estadoDaPeca(1, [reserva(-5, 4)]);
  assert.equal(e.disponivel, false);
  assert.equal(toISODay(e.disponivelDe), toISODay(addDays(hoje, 5)));
});

test("reserva já vencida não bloqueia nada", () => {
  const e = estadoDaPeca(1, [reserva(-20, -3)]);
  assert.equal(e.disponivel, true);
});

test("reserva cancelada ou devolvida não bloqueia", () => {
  const e = estadoDaPeca(1, [reserva(1, 9, "CANCELADA"), reserva(1, 9, "DEVOLVIDA")]);
  assert.equal(e.disponivel, true);
});

test("com dois exemplares, um reservado deixa o outro disponível", () => {
  const e = estadoDaPeca(2, [reserva(1, 9)]);
  assert.equal(e.disponivel, true);
});

test("com dois exemplares ambos reservados, liberta no primeiro que vencer", () => {
  const e = estadoDaPeca(2, [reserva(1, 9), reserva(2, 20)]);
  assert.equal(e.disponivel, false);
  assert.equal(toISODay(e.disponivelDe), toISODay(addDays(hoje, 10)));
});

test("peça em higienização continua fora do catálogo", () => {
  // voltou ontem, a higienização acaba daqui a três dias
  const e = estadoDaPeca(1, [reserva(-8, 3, "EM_HIGIENIZACAO")]);
  assert.equal(e.disponivel, false);
  assert.equal(toISODay(e.disponivelDe), toISODay(addDays(hoje, 4)));
});

test("peça sai da higienização e volta ao site no dia seguinte", () => {
  const e = estadoDaPeca(1, [reserva(-10, -1, "EM_HIGIENIZACAO")]);
  assert.equal(e.disponivel, true);
});

test("higienização adiada pelo funcionário adia a disponibilidade", () => {
  // o funcionário empurrou o fim do bloqueio de 3 para 10 dias
  const normal = estadoDaPeca(1, [reserva(-5, 3, "EM_HIGIENIZACAO")]);
  const adiada = estadoDaPeca(1, [reserva(-5, 10, "EM_HIGIENIZACAO")]);
  assert.equal(toISODay(normal.disponivelDe), toISODay(addDays(hoje, 4)));
  assert.equal(toISODay(adiada.disponivelDe), toISODay(addDays(hoje, 11)));
});

test("não se aceita reserva enquanto a peça está em higienização", () => {
  const r = periodoEstaLivre(
    1,
    2,
    [reserva(-6, 5, "EM_HIGIENIZACAO")],
    addDays(hoje, 2),
    addDays(hoje, 4)
  );
  assert.equal(r.livre, false);
});

test("peça sem exemplares de aluguer nunca fica disponível", () => {
  const e = estadoDaPeca(0, []);
  assert.equal(e.disponivel, false);
  assert.equal(e.exemplares, 0);
});

// ------------------------------------------------ período livre

test("não aceita reserva por cima de outra reserva", () => {
  const r = periodoEstaLivre(1, 2, [reserva(2, 12)], addDays(hoje, 3), addDays(hoje, 5));
  assert.equal(r.livre, false);
  assert.match(r.motivo!, /reservada/i);
});

test("aceita reserva depois de a peça ficar livre", () => {
  const r = periodoEstaLivre(1, 2, [reserva(-4, 3)], addDays(hoje, 4), addDays(hoje, 6));
  assert.equal(r.livre, true);
});

test("recusa datas no passado", () => {
  const r = periodoEstaLivre(1, 2, [], addDays(hoje, -2), addDays(hoje, 2));
  assert.equal(r.livre, false);
});

test("recusa devolução antes do levantamento", () => {
  const r = periodoEstaLivre(1, 2, [], addDays(hoje, 5), addDays(hoje, 3));
  assert.equal(r.livre, false);
});

// -------------------------------------------------- orçamento

const precos = {
  rentalDayPrice: 20000,
  rentalWeekendPrice: 45000,
  rentalDeposit: 100000,
  minRentalDays: 1,
  maxRentalDays: 14,
};

test("aluguer por dias multiplica o preço diário", () => {
  const o = orcamentoAluguer(precos, parseDay("2026-10-06"), parseDay("2026-10-08"));
  assert.ok(!("erro" in o));
  if ("erro" in o) return;
  assert.equal(o.dias, 3);
  assert.equal(o.preco, 60000);
  assert.equal(o.caucao, 100000);
});

test("período de sexta a domingo usa o pacote de fim-de-semana", () => {
  // 2026-10-02 é uma sexta-feira
  const o = orcamentoAluguer(precos, parseDay("2026-10-02"), parseDay("2026-10-04"));
  assert.ok(!("erro" in o));
  if ("erro" in o) return;
  assert.equal(o.pacoteFimDeSemana, true);
  assert.equal(o.preco, 45000);
});

test("o pacote não se aplica se sair mais caro do que os dias soltos", () => {
  const o = orcamentoAluguer(
    { ...precos, rentalWeekendPrice: 90000 },
    parseDay("2026-10-02"),
    parseDay("2026-10-03")
  );
  assert.ok(!("erro" in o));
  if ("erro" in o) return;
  assert.equal(o.pacoteFimDeSemana, false);
  assert.equal(o.preco, 40000);
});

test("respeita o mínimo de dias do produto", () => {
  const o = orcamentoAluguer(
    { ...precos, minRentalDays: 3 },
    parseDay("2026-10-06"),
    parseDay("2026-10-06")
  );
  assert.ok("erro" in o);
});

// ----------------------------------------- calendário de prova

const config: ConfigAtelie = {
  openDays: [1, 2, 3, 4, 5, 6], // fechado ao domingo
  openHour: "09:00",
  closeHour: "12:00",
  slotMinutes: 60,
  slotCapacity: 2,
  minNoticeHours: 24,
  bookingHorizonDays: 45,
  closedDates: [],
};

test("o ateliê não oferece horas ao domingo", () => {
  const dias = calendarioDeProva({ config, marcacoes: [], dias: 14 });
  const domingos = dias.filter((d) => d.diaSemana === 0);
  assert.ok(domingos.length > 0);
  assert.ok(domingos.every((d) => !d.aberto));
});

test("não se marca prova para hoje com 24h de antecedência exigidas", () => {
  const dias = calendarioDeProva({ config, marcacoes: [], dias: 3 });
  assert.equal(dias[0].aberto, false);
});

test("quando as cabines estão cheias o horário desaparece", () => {
  const dia = addDays(hoje, 3);
  const iso = toISODay(dia);
  const dias = calendarioDeProva({
    config,
    marcacoes: [
      { data: iso, hora: "09:00", variantId: "outra-1" },
      { data: iso, hora: "09:00", variantId: "outra-2" },
    ],
    dias: 10,
  });
  const alvo = dias.find((d) => d.data === iso)!;
  const slot = alvo.slots.find((s) => s.hora === "09:00")!;
  assert.equal(slot.disponivel, false);
});

test("a mesma peça não pode estar em duas provas à mesma hora", () => {
  const dia = addDays(hoje, 3);
  const iso = toISODay(dia);
  const dias = calendarioDeProva({
    config,
    variantId: "peca-a",
    marcacoes: [{ data: iso, hora: "10:00", variantId: "peca-a" }],
    dias: 10,
  });
  const alvo = dias.find((d) => d.data === iso)!;
  const slot = alvo.slots.find((s) => s.hora === "10:00")!;
  assert.equal(slot.disponivel, false);
  assert.match(slot.motivo!, /prova/i);
});

test("peça alugada não tem horas de prova antes de voltar ao ateliê", () => {
  const volta = addDays(hoje, 6);
  const dias = calendarioDeProva({
    config,
    pecaDisponivelDe: volta,
    marcacoes: [],
    dias: 12,
  });
  const antes = dias.filter((d) => parseDay(d.data).getTime() < volta.getTime());
  assert.ok(antes.every((d) => !d.aberto));
  assert.ok(antes.some((d) => d.motivo === "Peça alugada nesta data"));
});
