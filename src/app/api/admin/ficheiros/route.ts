import { NextResponse } from "next/server";
import { exigirSeccao } from "@/lib/auth";
import { registarAlteracao } from "@/lib/auditoria";
import { guardarFicheiro } from "@/lib/armazenamento";
import { RECURSOS, type Recurso } from "@/lib/permissoes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Carregamento de ficheiros pelo painel. Quem carrega tem de poder alterar
 * a área indicada (ex.: "produtos" para fotografias de peças).
 */
export async function POST(request: Request) {
  try {
    const dados = await request.formData();
    const area = String(dados.get("area") ?? "");
    if (!RECURSOS.some((r) => r.chave === area)) {
      return NextResponse.json({ erro: "Área desconhecida." }, { status: 400 });
    }

    const eu = await exigirSeccao(area as Recurso, "editar");
    const ficheiro = dados.get("ficheiro");
    if (!(ficheiro instanceof File) || ficheiro.size === 0) {
      return NextResponse.json({ erro: "Escolha um ficheiro." }, { status: 400 });
    }

    const r = await guardarFicheiro({ ficheiro, pasta: area, utilizadorId: eu.id });
    if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 400 });

    await registarAlteracao({
      actorId: eu.id,
      area: "FICHEIRO",
      acao: "CARREGAR",
      entidadeId: r.id,
      mensagem: `${eu.name} carregou ${ficheiro.name} (${Math.round(ficheiro.size / 1024)} KB) para ${area}.`,
    });

    return NextResponse.json({ ok: true, url: r.url });
  } catch (e) {
    if (e instanceof Error && "status" in e) {
      return NextResponse.json({ erro: e.message }, { status: Number((e as { status?: number }).status) || 403 });
    }
    console.error("Erro ao carregar ficheiro:", e);
    return NextResponse.json({ erro: "Não foi possível carregar o ficheiro." }, { status: 500 });
  }
}
