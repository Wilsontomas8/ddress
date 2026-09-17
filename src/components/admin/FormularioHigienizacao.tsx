"use client";

/**
 * Registo da devolução e da higienização de uma peça.
 *
 * O funcionário indica quando a peça voltou e a partir de que dia pode
 * voltar a sair. Até esse dia, a peça não aparece no site.
 */

import { useState, useTransition } from "react";
import { libertarPeca, registarHigienizacao } from "@/app/admin/acoes";
import { formatNumericDate } from "@/lib/dates";
import type { ReservationStatus } from "@/db/schema";

export type DadosHigienizacao = {
  reservationId: string;
  /** "Vestido de Gala Bordeaux · 38 · Bordeaux" */
  peca: string;
  status: ReservationStatus;
  /** Dia de devolução combinado, "2026-10-04" */
  fimCombinado: string;
  /** Dia em que a peça voltou mesmo, se já foi registado */
  devolvidaEm: string | null;
  /** Primeiro dia em que a peça volta a estar disponível */
  disponivelEm: string;
  cleaningNote: string | null;
  /** Dias de higienização definidos no produto */
  diasHigienizacao: number;
};

function hojeISO() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function somaDias(iso: string, dias: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default function FormularioHigienizacao({
  dados,
  compacto = false,
}: {
  dados: DadosHigienizacao;
  compacto?: boolean;
}) {
  const [aProcessar, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [aberto, setAberto] = useState(!compacto);

  const jaRegistado = !!dados.devolvidaEm;
  const devolvidaPorOmissao = dados.devolvidaEm ?? hojeISO();
  const [devolvidaEm, setDevolvidaEm] = useState(devolvidaPorOmissao);
  const [disponivelEm, setDisponivelEm] = useState(
    jaRegistado ? dados.disponivelEm : somaDias(devolvidaPorOmissao, dados.diasHigienizacao)
  );

  function correr(accao: () => Promise<{ ok: boolean; mensagem?: string; erro?: string }>) {
    setAviso(null);
    iniciar(async () => {
      const r = await accao();
      setAviso(
        r.ok
          ? { tipo: "ok", texto: r.mensagem ?? "Registado." }
          : { tipo: "erro", texto: r.erro ?? "Não foi possível registar." }
      );
    });
  }

  if (compacto && !aberto) {
    return (
      <button
        type="button"
        className="btn btn-contorno px-3 py-1 text-xs"
        onClick={() => setAberto(true)}
      >
        {dados.status === "EM_HIGIENIZACAO" ? "Ajustar higienização" : "Registar devolução"}
      </button>
    );
  }

  return (
    <div className={compacto ? "w-[26rem] max-w-[80vw] py-2" : ""}>
      {!compacto && (
        <div className="mb-3">
          <h3 className="font-display text-lg">Devolução e higienização</h3>
          <p className="mt-1 text-sm text-tinta-70">
            {dados.peca} · devolução combinada para {formatNumericDate(dados.fimCombinado)}
          </p>
        </div>
      )}

      {dados.status === "EM_HIGIENIZACAO" && !aviso && (
        <p className="mb-3 border-l-2 border-azul bg-marfim-50 px-3 py-2 text-sm">
          Em higienização. Volta ao site a{" "}
          <strong>{formatNumericDate(dados.disponivelEm)}</strong>.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          correr(() => registarHigienizacao(fd));
        }}
      >
        <input type="hidden" name="reservationId" value={dados.reservationId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="etiqueta">A peça voltou ao ateliê em</span>
            <input
              type="date"
              className="campo"
              name="devolvidaEm"
              required
              value={devolvidaEm}
              onChange={(e) => {
                const nova = e.target.value;
                setDevolvidaEm(nova);
                // a data de disponibilidade acompanha, mantendo os dias
                // de higienização do produto
                if (nova) setDisponivelEm(somaDias(nova, dados.diasHigienizacao));
              }}
            />
          </label>

          <label>
            <span className="etiqueta">Disponível outra vez a partir de</span>
            <input
              type="date"
              className="campo"
              name="disponivelEm"
              required
              min={devolvidaEm}
              value={disponivelEm}
              onChange={(e) => setDisponivelEm(e.target.value)}
            />
            <span className="mt-1 block text-xs text-tinta-50">
              Sugerido: {dados.diasHigienizacao} dia(s) de higienização. Atrase se a
              lavandaria ou um arranjo precisarem de mais tempo.
            </span>
          </label>

          <label className="sm:col-span-2">
            <span className="etiqueta">Notas da higienização (opcional)</span>
            <input
              className="campo"
              name="cleaningNote"
              defaultValue={dados.cleaningNote ?? ""}
              placeholder="Ex.: nódoa na bainha, foi à lavandaria a 3/10"
            />
          </label>
        </div>

        {aviso && (
          <p
            className={`mt-3 border-l-2 px-3 py-2 text-sm ${
              aviso.tipo === "ok"
                ? "border-verde bg-marfim-50"
                : "border-ouro bg-marfim-50 text-ouro-escuro"
            }`}
          >
            {aviso.texto}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="btn btn-principal" disabled={aProcessar}>
            {jaRegistado ? "Guardar datas" : "Guardar devolução"}
          </button>

          {dados.status === "EM_HIGIENIZACAO" && (
            <button
              type="button"
              className="btn btn-contorno"
              disabled={aProcessar}
              onClick={() => correr(() => libertarPeca(dados.reservationId))}
            >
              Higienização concluída — libertar já
            </button>
          )}

          {compacto && (
            <button
              type="button"
              className="btn btn-contorno"
              onClick={() => setAberto(false)}
            >
              Fechar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
