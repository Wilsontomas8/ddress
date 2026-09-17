"use client";

import { useState, useTransition } from "react";
import {
  registarEntrega,
  registarRecolha,
  registarTentativaDeEntrega,
} from "@/app/admin/acoes";

export default function AccoesEntrega({
  orderId,
  tipo,
}: {
  orderId: string;
  tipo: "ENTREGA" | "RECOLHA";
}) {
  const [aProcessar, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [tentativaAberta, setTentativaAberta] = useState(false);

  function correr(accao: () => Promise<{ ok: boolean; mensagem?: string; erro?: string }>) {
    setAviso(null);
    iniciar(async () => {
      const r = await accao();
      setAviso(
        r.ok
          ? { tipo: "ok", texto: r.mensagem ?? "Registado." }
          : { tipo: "erro", texto: r.erro ?? "Não foi possível registar." }
      );
      if (r.ok) setTentativaAberta(false);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tipo === "ENTREGA" ? (
          <>
            <button
              type="button"
              className="btn btn-principal px-3 py-1.5 text-xs"
              disabled={aProcessar}
              onClick={() => correr(() => registarEntrega(orderId))}
            >
              Entregue ao cliente
            </button>
            <button
              type="button"
              className="btn btn-contorno px-3 py-1.5 text-xs"
              onClick={() => setTentativaAberta((v) => !v)}
            >
              Não consegui entregar
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-principal px-3 py-1.5 text-xs"
            disabled={aProcessar}
            onClick={() => correr(() => registarRecolha(orderId))}
          >
            Peça recolhida
          </button>
        )}
      </div>

      {tentativaAberta && (
        <form
          className="mt-3 flex flex-wrap gap-2"
          action={(fd) => correr(() => registarTentativaDeEntrega(fd))}
        >
          <input type="hidden" name="orderId" value={orderId} />
          <input
            className="campo max-w-72"
            name="motivo"
            placeholder="Ex.: ninguém em casa; cliente pediu para voltar amanhã"
          />
          <button type="submit" className="btn btn-contorno px-3 py-1.5 text-xs" disabled={aProcessar}>
            Registar tentativa
          </button>
        </form>
      )}

      {aviso && (
        <p
          className={`mt-2 text-xs ${aviso.tipo === "ok" ? "text-verde" : "text-rubi"}`}
        >
          {aviso.texto}
        </p>
      )}
    </div>
  );
}
