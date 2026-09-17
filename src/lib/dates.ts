/**
 * Utilitários de data. Trabalhamos sempre com "dias civis" em UTC para
 * que a mesma data não mude conforme o fuso do servidor (Angola = UTC+1).
 */

export const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** "2026-09-14" -> Date em UTC à meia-noite */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Date -> "2026-09-14" */
export function toISODay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Hoje, à meia-noite UTC */
export function today(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Número de dias entre duas datas, contando ambas (14→16 = 3 dias) */
export function inclusiveDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

export function sameDay(a: Date, b: Date): boolean {
  return toISODay(a) === toISODay(b);
}

export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

/** Intervalos [aStart,aEnd] e [bStart,bEnd] sobrepõem-se? (inclusivo) */
export function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
}

/** "14 de Setembro de 2026" */
export function formatLongDate(date: Date): string {
  return `${date.getUTCDate()} de ${MESES[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

/** "Seg, 14 Set" */
export function formatShortDate(date: Date): string {
  return `${DIAS_SEMANA[date.getUTCDay()].slice(0, 3)}, ${date.getUTCDate()} ${MESES[
    date.getUTCMonth()
  ].slice(0, 3)}`;
}

/** "14/09/2026" */
export function formatNumericDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseDay(date.slice(0, 10)) : date;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/** "14/09/2026 às 15:32" — para carimbos de data/hora (hora de Luanda) */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Africa/Luanda",
  }).format(d);
}

/** "09:00" -> minutos desde a meia-noite */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
