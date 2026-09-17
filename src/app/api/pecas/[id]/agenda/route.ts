import { NextResponse } from "next/server";
import { agendaDaPeca } from "@/lib/marcacoes";
import { parseDay, toISODay, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * GET /api/pecas/<variantId>/agenda?desde=2026-09-20&dias=21
 *
 * Devolve o calendário de prova DESTA peça: só dias em que a peça está
 * no ateliê e o ateliê tem cabine livre.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);

  const desdeParam = url.searchParams.get("desde");
  const diasParam = parseInt(url.searchParams.get("dias") ?? "21", 10);

  let desde = today();
  if (desdeParam && /^\d{4}-\d{2}-\d{2}$/.test(desdeParam)) {
    const pedido = parseDay(desdeParam);
    if (pedido.getTime() > desde.getTime()) desde = pedido;
  }

  const dias = Math.min(Math.max(Number.isNaN(diasParam) ? 21 : diasParam, 7), 60);

  const { peca, dias: calendario } = await agendaDaPeca({ variantId: id, desde, dias });

  return NextResponse.json({
    peca: peca
      ? {
          disponivel: peca.disponivel,
          disponivelDe: toISODay(peca.disponivelDe),
          ocupadaAte: peca.ocupadaAte ? toISODay(peca.ocupadaAte) : null,
          exemplares: peca.exemplares,
        }
      : null,
    desde: toISODay(desde),
    dias: calendario,
  });
}
