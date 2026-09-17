import { NextResponse } from "next/server";
import { expirarReservasSemProva } from "@/lib/reservas";
import { avisarQuemEsperava } from "@/lib/espera";

/**
 * Tarefa agendada: expira as reservas sem prova dentro do prazo e avisa
 * quem ficou à espera de uma peça que já voltou.
 *
 * Na Fase 2 é chamada pelo Vercel Cron (ver vercel.json) com o cabeçalho
 * Authorization: Bearer <CRON_SECRET>. Sem CRON_SECRET definido só é
 * aceite fora de produção.
 */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  const autorizacao = request.headers.get("authorization");

  if (segredo ? autorizacao !== `Bearer ${segredo}` : process.env.NODE_ENV === "production") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const expiradas = await expirarReservasSemProva();
  const espera = await avisarQuemEsperava();
  return NextResponse.json({ expiradas, avisosDeDisponibilidade: espera });
}
