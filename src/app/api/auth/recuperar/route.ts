import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { enderecoDoPedido, pedirRecuperacao, registarTentativa, tentativasEsgotadas } from "@/lib/contas";

export const dynamic = "force-dynamic";

const esquema = z.object({ email: z.string().email("E-mail inválido.") });

/**
 * Pede uma nova palavra-passe. A resposta é sempre a mesma, exista ou não
 * conta com aquele e-mail; assim ninguém descobre quem é cliente da loja.
 */
export async function POST(request: Request) {
  try {
    const { email } = esquema.parse(await request.json());
    const ip = enderecoDoPedido(request);

    if (await tentativasEsgotadas(email, ip)) {
      return NextResponse.json({ erro: "Demasiados pedidos. Tente dentro de 15 minutos." }, { status: 429 });
    }

    const r = await pedirRecuperacao(email, ip);
    // Pedidos a mais pelo mesmo endereço também contam para o travão.
    if (!r.enviado) await registarTentativa(email, ip, false);

    return NextResponse.json({
      ok: true,
      mensagem: "Se existir conta com esse e-mail, enviámos a ligação para definir nova palavra-passe.",
      semConfiguracao: r.semConfiguracao,
      ligacao: r.ligacao,
    });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ erro: e.issues[0]?.message }, { status: 400 });
    console.error("Erro ao pedir recuperação:", e);
    return NextResponse.json({ erro: "Não foi possível tratar o pedido." }, { status: 500 });
  }
}
