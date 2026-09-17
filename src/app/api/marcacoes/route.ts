import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, productVariants, products } from "@/db/schema";
import { getSessao } from "@/lib/auth";
import { parseDay } from "@/lib/dates";
import { horarioLivre, proximoCodigoMarcacao } from "@/lib/marcacoes";

export const dynamic = "force-dynamic";

const esquema = z.object({
  nome: z.string().min(3, "Indique o nome completo."),
  telefone: z.string().min(9, "Indique um telefone válido."),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  variantId: z.string().min(1, "Escolha a peça e o tamanho."),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha o dia."),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Escolha a hora."),
  fim: z.string().regex(/^\d{2}:\d{2}$/),
  notas: z.string().max(600).optional(),
});

/** POST /api/marcacoes — marcação de prova sem passar pelo carrinho */
export async function POST(request: Request) {
  try {
    const dados = esquema.parse(await request.json());
    const data = parseDay(dados.data);

    const [linha] = await db
      .select({ v: productVariants, p: products })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(eq(productVariants.id, dados.variantId))
      .limit(1);

    if (!linha) {
      return NextResponse.json({ erro: "Peça não encontrada." }, { status: 404 });
    }

    const livre = await horarioLivre({ variantId: dados.variantId, data, hora: dados.hora });
    if (!livre.livre) {
      return NextResponse.json({ erro: livre.motivo }, { status: 409 });
    }

    const sessao = await getSessao();

    const [marcacao] = await db
      .insert(appointments)
      .values({
        code: await proximoCodigoMarcacao(),
        userId: sessao?.id ?? null,
        customerName: dados.nome.trim(),
        customerPhone: dados.telefone.trim(),
        customerEmail: dados.email?.trim() || null,
        productId: linha.p.id,
        variantId: linha.v.id,
        date: data,
        startTime: dados.hora,
        endTime: dados.fim,
        status: "PENDENTE",
        notes:
          dados.notas?.trim() ||
          `Prova de ${linha.p.name} (Tamanho ${linha.v.size} · ${linha.v.color}).`,
      })
      .returning();

    return NextResponse.json({
      codigo: marcacao.code,
      data: dados.data,
      hora: dados.hora,
      peca: `${linha.p.name} · Tamanho ${linha.v.size}`,
    });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ erro: e.issues[0]?.message }, { status: 400 });
    }
    console.error("Erro ao marcar prova:", e);
    return NextResponse.json({ erro: "Não foi possível marcar a prova." }, { status: 500 });
  }
}
