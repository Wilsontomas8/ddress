"use client";

/**
 * Calendário de prova de UMA peça.
 *
 * Só mostra dias em que aquela peça está no ateliê (não está alugada) e
 * em que ainda há cabine livre. Os dados vêm do servidor — o navegador
 * nunca decide sozinho o que está disponível.
 */

import { useCallback, useEffect, useState } from "react";
import { DIAS_SEMANA, MESES, parseDay } from "@/lib/dates";
import { momentoDaProva } from "@/lib/expiracao";

export type HorarioEscolhido = { data: string; hora: string; fim: string };

type Slot = { hora: string; fim: string; disponivel: boolean; vagas: number; motivo?: string };
type Dia = {
  data: string;
  diaSemana: number;
  aberto: boolean;
  motivo?: string;
  slots: Slot[];
  vagasTotais: number;
};
type Resposta = {
  peca: { disponivel: boolean; disponivelDe: string; ocupadaAte: string | null; exemplares: number } | null;
  desde: string;
  dias: Dia[];
};

type Props = {
  variantId: string | null;
  valor: HorarioEscolhido | null;
  onChange: (v: HorarioEscolhido | null) => void;
  /** Texto de ajuda por cima da grelha */
  legenda?: string;
  /** Instante (ISO) até ao qual a prova tem de acontecer — reservas de aluguer */
  limite?: string | null;
};

const JANELA = 21;

export default function CalendarioProva({ variantId, valor, onChange, legenda, limite }: Props) {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [desde, setDesde] = useState<string | null>(null);
  const [diaAberto, setDiaAberto] = useState<string | null>(null);

  const carregar = useCallback(
    async (inicio: string | null, manterDiaEscolhido = true) => {
      if (!variantId) {
        setDados(null);
        return;
      }
      setACarregar(true);
      setErro(null);
      try {
        const url = new URL(`/api/pecas/${variantId}/agenda`, window.location.origin);
        if (inicio) url.searchParams.set("desde", inicio);
        url.searchParams.set("dias", String(JANELA));
        const r = await fetch(url.toString());
        if (!r.ok) throw new Error("Não foi possível carregar o calendário.");
        const json: Resposta = await r.json();
        setDados(json);
        const primeiro = json.dias.find((d) => d.aberto);
        setDiaAberto((atual) =>
          manterDiaEscolhido && atual && json.dias.some((d) => d.data === atual && d.aberto)
            ? atual
            : (primeiro?.data ?? null)
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar o calendário.");
      } finally {
        setACarregar(false);
      }
    },
    [variantId]
  );

  // Ao trocar de peça, o calendário recomeça do princípio: o dia que
  // estava escolhido era daquela peça, não desta.
  useEffect(() => {
    setDesde(null);
    setDiaAberto(null);
    onChange(null);
    carregar(null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantId]);

  useEffect(() => {
    if (desde) carregar(desde);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde]);

  if (!variantId) {
    return (
      <p className="cartao p-4 text-sm text-tinta-50">
        Escolha primeiro o tamanho da peça para ver as horas disponíveis.
      </p>
    );
  }

  // Horas depois do limite da reserva não servem: a reserva expiraria.
  const limiteMs = limite ? new Date(limite).getTime() : null;
  const dentroDoLimite = (data: string, hora: string) =>
    limiteMs === null || momentoDaProva(parseDay(data), hora).getTime() <= limiteMs;
  const dias = (dados?.dias ?? []).map((d) => {
    if (limiteMs === null) return d;
    const slots = d.slots.map((s) =>
      s.disponivel && !dentroDoLimite(d.data, s.hora)
        ? { ...s, disponivel: false, motivo: "Depois do limite da reserva" }
        : s
    );
    return { ...d, slots, aberto: d.aberto && slots.some((s) => s.disponivel) };
  });
  const diasAbertos = dias.filter((d) => d.aberto);
  const dia = dias.find((d) => d.data === diaAberto) ?? null;

  function rotulo(data: string) {
    const d = parseDay(data);
    return {
      semana: DIAS_SEMANA[d.getUTCDay()].slice(0, 3),
      numero: d.getUTCDate(),
      mes: MESES[d.getUTCMonth()].slice(0, 3),
    };
  }

  const podeRecuar = !!desde;

  return (
    <div>
      {legenda && <p className="mb-2 text-sm text-tinta-70">{legenda}</p>}

      {limite && (
        <p className="mb-3 border-l-2 border-ouro bg-marfim-100 px-3 py-2 text-sm text-tinta-70">
          A prova tem de ser até <strong className="text-tinta">{formatarInstante(limite)}</strong>.
          Sem prova até lá, a reserva expira e a peça volta a ficar livre.
        </p>
      )}

      {dados?.peca && dados.peca.exemplares > 0 && !dados.peca.disponivel && (
        <p className="mb-3 border-l-2 border-ouro bg-marfim-100 px-3 py-2 text-sm text-tinta-70">
          Esta peça está alugada. Volta ao ateliê a{" "}
          <strong className="text-tinta">{formatarData(dados.peca.disponivelDe)}</strong> — as
          provas começam nesse dia.
        </p>
      )}

      {aCarregar && <p className="text-sm text-tinta-50">A carregar horários…</p>}
      {erro && <p className="text-sm text-ouro-escuro">{erro}</p>}

      {!aCarregar && !erro && diasAbertos.length === 0 && (
        <p className="cartao p-4 text-sm text-tinta-70">
          Não há horas livres nas próximas três semanas.{" "}
          <button
            type="button"
            className="text-ouro-escuro underline underline-offset-4"
            onClick={() => setDesde(dias[dias.length - 1]?.data ?? null)}
          >
            Ver semanas seguintes
          </button>
        </p>
      )}

      {diasAbertos.length > 0 && (
        <>
          {/* ------------------------------------------------- dias */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!podeRecuar}
              onClick={() => setDesde(null)}
              className="btn btn-contorno px-2 py-1 text-xs disabled:opacity-30"
              aria-label="Voltar aos primeiros dias"
            >
              ←
            </button>

            <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
              {diasAbertos.map((d) => {
                const r = rotulo(d.data);
                const ativo = d.data === diaAberto;
                return (
                  <button
                    key={d.data}
                    type="button"
                    onClick={() => setDiaAberto(d.data)}
                    className={`shrink-0 border px-3 py-2 text-center transition-colors ${
                      ativo
                        ? "border-ouro bg-ouro text-preto"
                        : "border-marfim-300 bg-superficie text-tinta hover:border-tinta"
                    }`}
                  >
                    <span className="block text-[0.65rem] tracking-wider uppercase opacity-80">
                      {r.semana}
                    </span>
                    <span className="block text-lg leading-tight">{r.numero}</span>
                    <span className="block text-[0.65rem] uppercase opacity-80">{r.mes}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setDesde(dias[dias.length - 1]?.data ?? null)}
              className="btn btn-contorno px-2 py-1 text-xs"
              aria-label="Ver dias seguintes"
            >
              →
            </button>
          </div>

          {/* ------------------------------------------------ horas */}
          {dia && (
            <div className="mt-4">
              <p className="etiqueta">Horas de {formatarData(dia.data)}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {dia.slots.map((s) => {
                  const escolhido =
                    valor?.data === dia.data && valor?.hora === s.hora;
                  return (
                    <button
                      key={s.hora}
                      type="button"
                      disabled={!s.disponivel}
                      title={s.motivo}
                      onClick={() =>
                        onChange(
                          escolhido ? null : { data: dia.data, hora: s.hora, fim: s.fim }
                        )
                      }
                      className={`border px-2 py-2 text-sm transition-colors ${
                        escolhido
                          ? "border-ouro bg-ouro text-preto"
                          : s.disponivel
                            ? "border-marfim-300 bg-superficie hover:border-tinta"
                            : "cursor-not-allowed border-marfim-200 bg-marfim-100 text-tinta-50 line-through"
                      }`}
                    >
                      {s.hora}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {valor && (
            <p className="mt-3 border-l-2 border-verde bg-marfim-100 px-3 py-2 text-sm">
              Prova marcada para <strong>{formatarData(valor.data)}</strong> às{" "}
              <strong>{valor.hora}</strong>.{" "}
              <button
                type="button"
                className="text-ouro-escuro underline underline-offset-4"
                onClick={() => onChange(null)}
              >
                Alterar
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
}

function formatarInstante(iso: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Luanda",
  }).format(new Date(iso));
}

function formatarData(iso: string) {
  const d = parseDay(iso);
  return `${DIAS_SEMANA[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}
