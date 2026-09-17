"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Resultado } from "@/app/admin/acoes-conteudos";

/** Botão que corre uma acção do servidor sem campos (apagar, mudar estado…) */
export default function BotaoAccao({
  acao,
  children,
  confirmar,
  depois,
  className = "btn btn-contorno",
  rotulo,
}: {
  acao: () => Promise<Resultado>;
  children: React.ReactNode;
  confirmar?: string;
  /** Página para onde seguir depois de correr bem (ex.: lista, depois de apagar) */
  depois?: string;
  className?: string;
  rotulo?: string;
}) {
  const router = useRouter();
  const [aProcessar, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        className={className}
        disabled={aProcessar}
        aria-label={rotulo}
        onClick={() => {
          if (confirmar && !window.confirm(confirmar)) return;
          setErro(null);
          iniciar(async () => {
            const r = await acao();
            if (!r.ok) return setErro(r.erro);
            if (depois) router.push(depois);
            else router.refresh();
          });
        }}
      >
        {children}
      </button>
      {erro && (
        <span role="alert" className="text-xs text-rubi">
          {erro}
        </span>
      )}
    </span>
  );
}
