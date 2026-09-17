import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, iniciarSessao } from "@/lib/auth";

export const dynamic = "force-dynamic";

const esquema = z.object({
  nome: z.string().min(3, "Indique o nome completo."),
  email: z.string().email("E-mail inválido."),
  telefone: z.string().min(9, "Indique um telefone válido."),
  password: z.string().min(6, "A palavra-passe precisa de pelo menos 6 caracteres."),
});

export async function POST(request: Request) {
  try {
    const dados = esquema.parse(await request.json());
    const email = dados.email.toLowerCase().trim();

    const [existente] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existente) {
      return NextResponse.json(
        { erro: "Já existe uma conta com este e-mail. Entre com a sua palavra-passe." },
        { status: 409 }
      );
    }

    const [novo] = await db
      .insert(users)
      .values({
        name: dados.nome.trim(),
        email,
        phone: dados.telefone.trim(),
        passwordHash: await hashPassword(dados.password),
        role: "CLIENTE",
      })
      .returning();

    await iniciarSessao({
      id: novo.id,
      nome: novo.name,
      email: novo.email,
      role: novo.role,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ erro: e.issues[0]?.message }, { status: 400 });
    }
    console.error("Erro no registo:", e);
    return NextResponse.json({ erro: "Não foi possível criar a conta." }, { status: 500 });
  }
}
