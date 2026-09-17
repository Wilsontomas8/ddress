import type { Passo } from "@/lib/acompanhamento";

const CIRCULO: Record<Passo["estado"], string> = {
  feito: "border-verde bg-verde",
  actual: "border-ouro bg-ouro",
  futuro: "border-marfim-300 bg-white",
  falhado: "border-rubi bg-rubi",
};

const TITULO: Record<Passo["estado"], string> = {
  feito: "text-tinta",
  actual: "text-tinta font-semibold",
  futuro: "text-tinta-50",
  falhado: "text-rubi font-semibold",
};

export default function LinhaDoTempo({ passos }: { passos: Passo[] }) {
  return (
    <ol className="space-y-4">
      {passos.map((passo) => (
        <li key={passo.chave} className="passo-linha relative flex gap-3 pl-0">
          <span
            aria-hidden="true"
            className={`mt-1 h-[0.9rem] w-[0.9rem] shrink-0 rounded-full border-2 ${CIRCULO[passo.estado]}`}
          />
          <div className="pb-1">
            <p className={`text-sm ${TITULO[passo.estado]}`}>
              {passo.titulo}
              {passo.estado === "actual" && (
                <span className="ml-2 text-[0.65rem] tracking-wider text-ouro-escuro uppercase">
                  agora
                </span>
              )}
            </p>
            <p className="text-xs text-tinta-50">{passo.descricao}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
