import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { inscreverNaNewsletter } from "@/lib/espera";

export const dynamic = "force-dynamic";

/** Inscrição na newsletter, sempre com consentimento explícito */
export async function POST(request: Request) {
  try {
    const r = await inscreverNaNewsletter(await request.json());
    return NextResponse.json({
      ok: true,
      mensagem: r.jaEstava ? "Já está na nossa lista." : "Está na lista. Enviámos-lhe um e-mail de boas-vindas.",
    });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ erro: e.issues[0]?.message }, { status: 400 });
    console.error("Erro na inscrição da newsletter:", e);
    return NextResponse.json({ erro: "Não foi possível inscrever." }, { status: 500 });
  }
}
