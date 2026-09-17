import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessao } from "@/lib/auth";
import { ErroDeSolicitacao, criarSolicitacao, esquemaSolicitacao } from "@/lib/solicitacoes";

export const dynamic = "force-dynamic";

/** POST /api/solicitacoes — maquilhagem com parceira ou pedido de sapatos */
export async function POST(request: Request) {
  try {
    const dados = esquemaSolicitacao.parse(await request.json());
    // Pedidos só se ligam pelo checkout; aqui a solicitação é avulsa.
    const sessao = await getSessao();
    const s = await criarSolicitacao({ ...dados, pedidoId: null }, sessao?.id ?? null);
    return NextResponse.json({ codigo: s.code });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ erro: e.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    if (e instanceof ErroDeSolicitacao) return NextResponse.json({ erro: e.message }, { status: 400 });
    console.error("Erro ao criar solicitação:", e);
    return NextResponse.json({ erro: "Não foi possível enviar a solicitação. Tente de novo." }, { status: 500 });
  }
}
