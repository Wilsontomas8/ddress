/**
 * Todos os valores são Kwanzas inteiros (sem cêntimos).
 */

export function formatKz(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("pt-AO", {
    maximumFractionDigits: 0,
  }).format(value)} Kz`;
}

/** Versão curta para cartões: 45.000 Kz */
export function formatKzShort(value: number | null | undefined): string {
  return formatKz(value);
}

export function parseKz(input: string): number {
  const cleaned = input.replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
}
