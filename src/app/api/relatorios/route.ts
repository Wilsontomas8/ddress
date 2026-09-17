import { NextResponse } from "next/server";
import { getUtilizador } from "@/lib/auth";
import { ACCOES } from "@/lib/permissoes";
import { mesAtual, relatorioMensal, relatorioParaCSV } from "@/lib/relatorios";

export const dynamic = "force-dynamic";

/**
 * GET /api/relatorios?mes=2026-09
 * Exporta o relatório mensal em CSV (abre directamente no Excel).
 * Só administrador e contabilista.
 */
export async function GET(request: Request) {
  const utilizador = await getUtilizador();

  if (!utilizador) {
    return NextResponse.json({ erro: "Precisa de iniciar sessão." }, { status: 401 });
  }
  if (!ACCOES.exportarFinanceiro(utilizador.role)) {
    return NextResponse.json(
      { erro: "O seu perfil não pode exportar dados financeiros." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const pedido = url.searchParams.get("mes");
  const mes = pedido && /^\d{4}-\d{2}$/.test(pedido) ? pedido : mesAtual();

  const relatorio = await relatorioMensal(mes);
  const csv = relatorioParaCSV(relatorio);

  // BOM para o Excel reconhecer os acentos
  const corpo = "﻿" + csv;

  return new NextResponse(corpo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ddress-relatorio-${mes}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
