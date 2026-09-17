import { NextResponse } from "next/server";
import { procurarSapatos } from "@/lib/conteudos";

export const dynamic = "force-dynamic";

/** GET /api/sapatos?q=dourada — sapatos disponíveis para a cliente escolher */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.slice(0, 60) ?? "";
  const sapatos = await procurarSapatos(q, 24);
  return NextResponse.json({
    sapatos: sapatos.map((s) => ({
      id: s.id,
      nome: s.nome,
      slug: s.slug,
      imagem: s.imagem,
      precoVenda: s.salePrice,
      precoDia: s.rentalDayPrice,
      oferta: s.oferta,
    })),
  });
}
