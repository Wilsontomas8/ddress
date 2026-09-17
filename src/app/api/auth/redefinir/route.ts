import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { redefinirPalavraPasse } from "@/lib/contas";

export const dynamic = "force-dynamic";

const esquema = z.object({
  codigo: z.string().min(10, "Ligação inválida."),
  password: z.string().min(8, "A palavra-passe precisa de pelo menos 8 caracteres."),
});

export async function POST(request: Request) {
  try {
    const dados = esquema.parse(await request.json());
    const r = await redefinirPalavraPasse(dados.codigo, dados.password);
    if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 400 });
    return NextResponse.json({ ok: true, email: r.email });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ erro: e.issues[0]?.message }, { status: 400 });
    console.error("Erro ao redefinir palavra-passe:", e);
    return NextResponse.json({ erro: "Não foi possível guardar a nova palavra-passe." }, { status: 500 });
  }
}
