"use client";

import { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";
import { formatKz } from "@/lib/money";

export type SapatoResumo = {
  id: string;
  nome: string;
  slug: string;
  imagem: string | null;
  precoVenda: number | null;
  precoDia: number | null;
};

/**
 * Procura de sapatos da DDRESS. Em modo "escolher" a cliente marca os que
 * quer; em modo "ver" cada sapato liga à sua página.
 */
export default function EscolherSapatos({
  escolhidos = [],
  onChange,
  modo = "escolher",
  inicial = [],
}: {
  escolhidos?: string[];
  onChange?: (ids: string[]) => void;
  modo?: "escolher" | "ver";
  inicial?: SapatoResumo[];
}) {
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<SapatoResumo[]>(inicial);
  const [aCarregar, setACarregar] = useState(inicial.length === 0);

  useEffect(() => {
    const controlo = new AbortController();
    const t = window.setTimeout(async () => {
      setACarregar(true);
      try {
        const r = await fetch(`/api/sapatos?q=${encodeURIComponent(q)}`, { signal: controlo.signal });
        const j = await r.json();
        setLista(j.sapatos ?? []);
      } catch {
        /* pedido substituído por outro */
      } finally {
        if (!controlo.signal.aborted) setACarregar(false);
      }
    }, 250);
    return () => {
      controlo.abort();
      window.clearTimeout(t);
    };
  }, [q]);

  function alternar(id: string) {
    if (!onChange) return;
    onChange(escolhidos.includes(id) ? escolhidos.filter((x) => x !== id) : [...escolhidos, id]);
  }

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Procurar sapatos</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-tinta-50" strokeWidth={1.6} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Procurar sapatos: dourado, scarpin, sandália…"
          className="campo pl-9"
          autoComplete="off"
        />
      </label>

      <p className="mt-2 text-xs text-tinta-50" aria-live="polite">
        {aCarregar ? "A procurar…" : `${lista.length} ${lista.length === 1 ? "modelo" : "modelos"}`}
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {lista.map((s) => {
          const marcado = escolhidos.includes(s.id);
          const corpo = (
            <>
              <span className="relative block overflow-hidden bg-marfim-100">
                {s.imagem && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imagem} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                )}
                {marcado && (
                  <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-ouro text-preto">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                )}
              </span>
              <span className="mt-2 block text-sm leading-snug font-medium">{s.nome}</span>
              <span className="num block text-xs text-tinta-50">
                {s.precoVenda ? formatKz(s.precoVenda) : ""}
                {s.precoVenda && s.precoDia ? " · " : ""}
                {s.precoDia ? `${formatKz(s.precoDia)}/dia` : ""}
              </span>
            </>
          );
          return (
            <li key={s.id}>
              {modo === "ver" ? (
                <a href={`/produto/${s.slug}`} className="block">
                  {corpo}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => alternar(s.id)}
                  aria-pressed={marcado}
                  className={`block w-full p-1 text-left transition-colors ${marcado ? "ring-1 ring-ouro" : "hover:bg-marfim-100"}`}
                >
                  {corpo}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
