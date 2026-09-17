"use client";

import { useState, useTransition } from "react";
import { bloquearPeca, libertarPeca } from "@/app/admin/acoes";

export function FormularioBloqueio({
  pecas,
}: {
  pecas: { id: string; etiqueta: string }[];
}) {
  const [aProcessar, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  return (
    <form
      className="cartao p-5"
      action={(fd) => {
        setAviso(null);
        iniciar(async () => {
          const r = await bloquearPeca(fd);
          setAviso(
            r.ok
              ? { tipo: "ok", texto: r.mensagem ?? "Feito." }
              : { tipo: "erro", texto: r.erro ?? "Não foi possível." }
          );
        });
      }}
    >
      <h2 className="font-display text-lg">Bloquear uma peça</h2>
      <p className="mt-1 text-sm text-tinta-70">
        Para alugueres feitos ao balcão, arranjos, sessões fotográficas ou qualquer motivo que
        tire a peça do ateliê. Enquanto estiver bloqueada, some do site.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2">
          <span className="etiqueta">Peça</span>
          <select className="campo" name="variantId" required>
            <option value="">Escolher…</option>
            {pecas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="etiqueta">De</span>
          <input type="date" className="campo" name="inicio" required />
        </label>
        <label>
          <span className="etiqueta">Até</span>
          <input type="date" className="campo" name="fim" required />
        </label>
        <label className="sm:col-span-2 lg:col-span-4">
          <span className="etiqueta">Motivo</span>
          <input className="campo" name="nota" placeholder="Ex.: aluguer ao balcão — Sr. Paulo" />
        </label>
      </div>

      {aviso && (
        <p
          className={`mt-3 border-l-2 px-3 py-2 text-sm ${
            aviso.tipo === "ok" ? "border-verde bg-marfim-50" : "border-ouro bg-marfim-50 text-ouro-escuro"
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <button type="submit" className="btn btn-principal mt-4" disabled={aProcessar}>
        Bloquear peça
      </button>
    </form>
  );
}

export function BotaoLibertar({ reservationId }: { reservationId: string }) {
  const [aProcessar, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        className="btn btn-contorno px-3 py-1 text-xs"
        disabled={aProcessar}
        onClick={() => {
          setAviso(null);
          iniciar(async () => {
            const r = await libertarPeca(reservationId);
            setAviso(r.ok ? (r.mensagem ?? "Libertada.") : (r.erro ?? "Não foi possível."));
          });
        }}
      >
        Libertar peça
      </button>
      {aviso && <span className="ml-2 text-xs text-verde">{aviso}</span>}
    </div>
  );
}
