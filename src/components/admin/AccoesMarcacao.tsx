"use client";

import { useState, useTransition } from "react";
import { guardarNotasProva, mudarEstadoMarcacao } from "@/app/admin/acoes";
import type { AppointmentStatus } from "@/db/schema";

const ACCOES: { estado: AppointmentStatus; texto: string; estilo: string }[] = [
  { estado: "CONFIRMADA", texto: "Confirmar", estilo: "btn-principal" },
  { estado: "REALIZADA", texto: "Prova feita", estilo: "btn-escuro" },
  { estado: "FALTOU", texto: "Faltou", estilo: "btn-contorno" },
  { estado: "CANCELADA", texto: "Cancelar", estilo: "btn-contorno" },
];

export default function AccoesMarcacao({
  id,
  estado,
  staffNotes,
}: {
  id: string;
  estado: AppointmentStatus;
  staffNotes: string | null;
}) {
  const [aProcessar, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const [notasAbertas, setNotasAbertas] = useState(false);

  function correr(accao: () => Promise<{ ok: boolean; mensagem?: string; erro?: string }>) {
    setAviso(null);
    iniciar(async () => {
      const r = await accao();
      setAviso(r.ok ? (r.mensagem ?? "Feito.") : (r.erro ?? "Não foi possível."));
    });
  }

  const fechada = estado === "REALIZADA" || estado === "CANCELADA" || estado === "FALTOU";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ACCOES.filter((a) => a.estado !== estado)
          .filter((a) => !fechada || a.estado === "CONFIRMADA")
          .map((a) => (
            <button
              key={a.estado}
              type="button"
              className={`btn ${a.estilo} px-3 py-1.5 text-xs`}
              disabled={aProcessar}
              onClick={() => correr(() => mudarEstadoMarcacao(id, a.estado))}
            >
              {a.texto}
            </button>
          ))}

        <button
          type="button"
          className="btn btn-contorno px-3 py-1.5 text-xs"
          onClick={() => setNotasAbertas((v) => !v)}
        >
          {staffNotes ? "Ver notas" : "Notas da prova"}
        </button>
      </div>

      {notasAbertas && (
        <form
          className="mt-3"
          action={(fd) => {
            correr(() => guardarNotasProva(fd));
            setNotasAbertas(false);
          }}
        >
          <input type="hidden" name="id" value={id} />
          <textarea
            className="campo"
            name="staffNotes"
            rows={3}
            defaultValue={staffNotes ?? ""}
            placeholder="Medidas, ajustes combinados, o que ficou por fazer…"
          />
          <button type="submit" className="btn btn-contorno mt-2 px-3 py-1.5 text-xs">
            Guardar notas
          </button>
        </form>
      )}

      {aviso && <p className="mt-2 text-xs text-verde">{aviso}</p>}
    </div>
  );
}
