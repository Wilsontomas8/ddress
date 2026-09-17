import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessao } from "@/lib/auth";
import { ErroDePedido, criarPedido, esquemaPedido } from "@/lib/pedidos";

export const dynamic = "force-dynamic";

/** POST /api/pedidos — fecha o carrinho e cria o pedido */
export async function POST(request: Request) {
  try {
    const corpo = await request.json();
    const dados = esquemaPedido.parse(corpo);
    const sessao = await getSessao();

    const pedido = await criarPedido(dados, sessao?.id ?? null);

    return NextResponse.json({
      numero: pedido.number,
      total: pedido.total,
      estado: pedido.status,
    });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { erro: e.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }
    if (e instanceof ErroDePedido) {
      return NextResponse.json({ erro: e.message }, { status: e.status });
    }
    console.error("Erro ao criar pedido:", e);
    return NextResponse.json(
      { erro: "Não foi possível registar o pedido. Tente de novo." },
      { status: 500 }
    );
  }
}
