import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { getSessao } from "@/lib/auth";
import { avisarPedidoCriado } from "@/lib/notificacoes";
import { ErroDePedido, criarPedido, esquemaPedido } from "@/lib/pedidos";
import { criarSolicitacao } from "@/lib/solicitacoes";

export const dynamic = "force-dynamic";

/**
 * POST /api/pedidos — fecha o carrinho e cria o pedido.
 * Se a cliente pediu maquilhagem ou sapatos, cria as solicitações ligadas
 * ao pedido. No fim avisa a cliente e a loja.
 */
export async function POST(request: Request) {
  try {
    const corpo = await request.json();
    const dados = esquemaPedido.parse(corpo);
    const sessao = await getSessao();

    // A parceira escolhida tem de existir antes de gravar o pedido.
    const maquilhagem = dados.extras?.maquilhagem;
    if (maquilhagem) {
      const [p] = await db
        .select({ id: partners.id })
        .from(partners)
        .where(and(eq(partners.id, maquilhagem.parceiroId), eq(partners.active, true)));
      if (!p) throw new ErroDePedido("A maquilhadora escolhida já não está disponível.");
    }

    const pedido = await criarPedido(dados, sessao?.id ?? null);

    const cliente = {
      pedidoId: pedido.id,
      nome: dados.cliente.nome,
      telefone: dados.cliente.telefone,
      email: dados.cliente.email,
    };
    const solicitacoes: string[] = [];
    if (maquilhagem) {
      const s = await criarSolicitacao(
        { tipo: "MAQUILHAGEM", parceiroId: maquilhagem.parceiroId, data: maquilhagem.data, hora: maquilhagem.hora, local: maquilhagem.local, notas: maquilhagem.notas, ...cliente },
        sessao?.id ?? null
      );
      solicitacoes.push(s.code);
    }
    const sapatos = dados.extras?.sapatos;
    if (sapatos) {
      const s = await criarSolicitacao(
        { tipo: "SAPATOS", tamanho: sapatos.tamanho, notas: sapatos.notas, produtos: sapatos.produtos, ...cliente },
        sessao?.id ?? null
      );
      solicitacoes.push(s.code);
    }

    await avisarPedidoCriado(pedido.id);

    return NextResponse.json({
      numero: pedido.number,
      total: pedido.total,
      estado: pedido.status,
      solicitacoes,
    });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ erro: e.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    if (e instanceof ErroDePedido) {
      return NextResponse.json({ erro: e.message }, { status: e.status });
    }
    console.error("Erro ao criar pedido:", e);
    return NextResponse.json({ erro: "Não foi possível registar o pedido. Tente de novo." }, { status: 500 });
  }
}
