import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { productVariants, products, rentalReservations } from "@/db/schema";
import {
  ESTADOS_QUE_BLOQUEIAM,
  orcamentoAluguer,
  periodoEstaLivre,
} from "@/lib/availability";
import { parseDay } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * GET /api/pecas/<variantId>/orcamento?inicio=2026-10-02&fim=2026-10-04
 *
 * Calcula o preço do aluguer no servidor e confirma que o período está
 * mesmo livre. O site nunca confia no preço vindo do navegador.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const inicioStr = url.searchParams.get("inicio");
  const fimStr = url.searchParams.get("fim");

  if (!inicioStr || !fimStr || !/^\d{4}-\d{2}-\d{2}$/.test(inicioStr) || !/^\d{4}-\d{2}-\d{2}$/.test(fimStr)) {
    return NextResponse.json({ erro: "Indique as datas de levantamento e devolução." }, { status: 400 });
  }

  const inicio = parseDay(inicioStr);
  const fim = parseDay(fimStr);

  const [linha] = await db
    .select({ v: productVariants, p: products })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(productVariants.id, id))
    .limit(1);

  if (!linha) {
    return NextResponse.json({ erro: "Peça não encontrada." }, { status: 404 });
  }

  const { v, p } = linha;

  if (p.offer === "VENDA" || v.rentalStock < 1) {
    return NextResponse.json({ erro: "Esta peça não está disponível para aluguer." }, { status: 400 });
  }

  const orcamento = orcamentoAluguer(
    {
      rentalDayPrice: p.rentalDayPrice,
      rentalWeekendPrice: p.rentalWeekendPrice,
      rentalDeposit: p.rentalDeposit,
      minRentalDays: p.minRentalDays,
      maxRentalDays: p.maxRentalDays,
    },
    inicio,
    fim
  );

  if ("erro" in orcamento) {
    return NextResponse.json({ erro: orcamento.erro }, { status: 400 });
  }

  const reservas = await db
    .select({
      startDate: rentalReservations.startDate,
      blockUntil: rentalReservations.blockUntil,
      status: rentalReservations.status,
    })
    .from(rentalReservations)
    .where(
      and(
        eq(rentalReservations.variantId, id),
        inArray(rentalReservations.status, ESTADOS_QUE_BLOQUEIAM)
      )
    );

  const livre = periodoEstaLivre(v.rentalStock, p.cleaningBufferDays, reservas, inicio, fim);
  if (!livre.livre) {
    return NextResponse.json({ erro: livre.motivo }, { status: 409 });
  }

  return NextResponse.json({
    dias: orcamento.dias,
    preco: orcamento.preco,
    caucao: orcamento.caucao,
    detalhe: orcamento.detalhe,
    pacoteFimDeSemana: orcamento.pacoteFimDeSemana,
    exigeProva: p.requiresFitting,
  });
}
