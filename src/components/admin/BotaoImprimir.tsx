"use client";

import { Printer } from "lucide-react";

/** Abre a janela de impressão — de onde se guarda o PDF */
export default function BotaoImprimir({ texto = "Imprimir / guardar PDF" }: { texto?: string }) {
  return (
    <button type="button" className="btn btn-principal" onClick={() => window.print()}>
      <Printer className="mr-2 h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
      {texto}
    </button>
  );
}
