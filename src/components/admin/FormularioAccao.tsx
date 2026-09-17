"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Resultado } from "@/app/admin/acoes-conteudos";

/**
 * Formulário ligado a uma acção do servidor. Mostra o resultado, pode limpar
 * os campos (para "acrescentar") ou seguir para a página do registo criado.
 * Sem permissão de edição, os campos ficam só de leitura.
 */
export default function FormularioAccao({
  acao,
  children,
  textoBotao = "Guardar",
  podeEditar = true,
  limpar = false,
  irPara,
  className = "space-y-5",
  botaoClassName = "btn btn-principal",
}: {
  acao: (fd: FormData) => Promise<Resultado>;
  children: React.ReactNode;
  textoBotao?: string;
  podeEditar?: boolean;
  limpar?: boolean;
  /** Ex.: "/admin/colecoes/{id}" — usado quando a acção devolve um id novo */
  irPara?: string;
  className?: string;
  botaoClassName?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [aProcessar, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  return (
    <form
      ref={ref}
      className={className}
      action={(fd) => {
        setAviso(null);
        iniciar(async () => {
          const r = await acao(fd);
          if (!r.ok) {
            setAviso({ tipo: "erro", texto: r.erro });
            return;
          }
          setAviso({ tipo: "ok", texto: r.mensagem ?? "Guardado." });
          if (limpar) ref.current?.reset();
          if (irPara && r.id && !fd.get("id")) router.push(irPara.replace("{id}", r.id));
          else router.refresh();
        });
      }}
    >
      <fieldset disabled={!podeEditar || aProcessar} className="contents">
        {children}
      </fieldset>
      {podeEditar && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={botaoClassName} disabled={aProcessar}>
            {aProcessar ? "A guardar…" : textoBotao}
          </button>
          {aviso && (
            <p role={aviso.tipo === "erro" ? "alert" : "status"} className={`text-sm ${aviso.tipo === "erro" ? "text-rubi" : "text-verde"}`}>
              {aviso.texto}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
