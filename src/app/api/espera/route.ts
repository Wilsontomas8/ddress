import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessao } from "@/lib/auth";
import { pedirAvisoDeDisponibilidade } from "@/lib/espera";

export const dynamic = "force-dynamic";

/** "Avise-me quando esta peça estiver livre" */
export async function POST(request: Request) {
  try {
    const sessao = await getSessao();
    const r = await pedirAvisoDeDisponibilidade(await request.json(), sessao?.id ?? null);
    return NextResponse.json({
      ok: true,
      mensagem: r.repetido
        ? `Já tínhamos o seu pedido para "${r.peca}" — avisamos assim que a peça voltar.`
        : `Combinado. Avisamos-lhe assim que "${r.peca}" estiver livre.`,
    });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ erro: e.issues[0]?.message }, { status: 400 });
    console.error("Erro no pedido de aviso:", e);
    return NextResponse.json({ erro: "Não foi possível registar o pedido." }, { status: 500 });
  }
}
