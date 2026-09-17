import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { iniciarSessao, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const esquema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Escreva a palavra-passe."),
});

export async function POST(request: Request) {
  try {
    const dados = esquema.parse(await request.json());
    const email = dados.email.toLowerCase().trim();

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // Mensagem igual para e-mail errado e palavra-passe errada: não
    // revelamos quais os e-mails registados.
    const invalido = NextResponse.json(
      { erro: "E-mail ou palavra-passe incorretos." },
      { status: 401 }
    );

    if (!user || !user.active) return invalido;
    if (!(await verifyPassword(dados.password, user.passwordHash))) return invalido;

    await iniciarSessao({
      id: user.id,
      nome: user.name,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({ ok: true, role: user.role });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ erro: e.issues[0]?.message }, { status: 400 });
    }
    console.error("Erro ao entrar:", e);
    return NextResponse.json({ erro: "Não foi possível entrar." }, { status: 500 });
  }
}
