"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CalendarioProva, { type HorarioEscolhido } from "./CalendarioProva";
import { DIAS_SEMANA, MESES, parseDay } from "@/lib/dates";

export type ProdutoParaProva = {
  id: string;
  nome: string;
  seccao: "HOMEM" | "MULHER" | "CRIANCA";
  variantes: { id: string; size: string; color: string }[];
};

const NOME_SECCAO = { HOMEM: "Homem", MULHER: "Mulher", CRIANCA: "Criança" } as const;

export default function FormularioMarcacao({
  produtos,
  utilizador,
}: {
  produtos: ProdutoParaProva[];
  utilizador: { nome: string; email: string; telefone: string } | null;
}) {
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState<string | null>(null);
  const [horario, setHorario] = useState<HorarioEscolhido | null>(null);
  const [nome, setNome] = useState(utilizador?.nome ?? "");
  const [telefone, setTelefone] = useState(utilizador?.telefone ?? "");
  const [email, setEmail] = useState(utilizador?.email ?? "");
  const [notas, setNotas] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);
  const [feito, setFeito] = useState<{ codigo: string; data: string; hora: string; peca: string } | null>(
    null
  );

  const produto = useMemo(
    () => produtos.find((p) => p.id === productId) ?? null,
    [productId, produtos]
  );

  const porSeccao = useMemo(() => {
    const mapa = new Map<string, ProdutoParaProva[]>();
    for (const p of produtos) {
      const lista = mapa.get(p.seccao) ?? [];
      lista.push(p);
      mapa.set(p.seccao, lista);
    }
    return mapa;
  }, [produtos]);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!variantId) {
      setErro("Escolha a peça e o tamanho.");
      return;
    }
    if (!horario) {
      setErro("Escolha o dia e a hora da prova.");
      return;
    }

    setAEnviar(true);
    try {
      const r = await fetch("/api/marcacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: telefone.trim(),
          email: email.trim(),
          variantId,
          data: horario.data,
          hora: horario.hora,
          fim: horario.fim,
          notas: notas.trim() || undefined,
        }),
      });
      const dados = await r.json();
      if (!r.ok) {
        setErro(dados.erro ?? "Não foi possível marcar a prova.");
        return;
      }
      setFeito(dados);
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setAEnviar(false);
    }
  }

  if (feito) {
    return (
      <div className="cartao p-8">
        <p className="text-[0.7rem] tracking-[0.14em] text-ouro-escuro uppercase">Prova marcada</p>
        <h2 className="mt-2 font-display text-2xl">{feito.codigo}</h2>
        <p className="mt-4 text-sm text-tinta-70">
          {feito.peca}
          <br />
          {formatarData(feito.data)} às {feito.hora}.
        </p>
        <p className="mt-4 text-sm text-tinta-70">
          Vamos confirmar consigo por telefone. Se precisar de mudar, ligue-nos.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/loja" className="btn btn-contorno">
            Ver a colecção
          </Link>
          <Link href="/conta" className="btn btn-escuro">
            As minhas marcações
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submeter} className="space-y-10">
      {/* --------------------------------------------------- 1. peça */}
      <section>
        <h2 className="font-display text-xl">1. Que peça quer experimentar?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="etiqueta">Peça</span>
            <select
              className="campo"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setVariantId(null);
                setHorario(null);
              }}
              required
            >
              <option value="">Escolher…</option>
              {[...porSeccao.entries()].map(([seccao, lista]) => (
                <optgroup key={seccao} label={NOME_SECCAO[seccao as keyof typeof NOME_SECCAO]}>
                  {lista.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label>
            <span className="etiqueta">Tamanho</span>
            <select
              className="campo"
              value={variantId ?? ""}
              disabled={!produto}
              onChange={(e) => {
                setVariantId(e.target.value || null);
                setHorario(null);
              }}
              required
            >
              <option value="">{produto ? "Escolher…" : "Escolha a peça primeiro"}</option>
              {produto?.variantes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.size} · {v.color}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* ------------------------------------------------- 2. horário */}
      <section>
        <h2 className="font-display text-xl">2. Quando lhe dá jeito?</h2>
        <p className="mt-2 mb-4 text-sm text-tinta-70">
          O calendário é desta peça em concreto: só mostra dias em que ela está no ateliê e há
          cabine livre.
        </p>
        <CalendarioProva variantId={variantId} valor={horario} onChange={setHorario} />
      </section>

      {/* -------------------------------------------------- 3. dados */}
      <section>
        <h2 className="font-display text-xl">3. Os seus dados</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="etiqueta">Nome completo</span>
            <input
              className="campo"
              required
              minLength={3}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            <span className="etiqueta">Telefone</span>
            <input
              className="campo"
              required
              minLength={9}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="+244 9__ ___ ___"
              autoComplete="tel"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="etiqueta">E-mail (opcional)</span>
            <input
              type="email"
              className="campo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="etiqueta">Quer dizer-nos alguma coisa?</span>
            <textarea
              className="campo"
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ex.: é para um casamento a 10 de Outubro; vou levar os sapatos."
            />
          </label>
        </div>
      </section>

      {erro && (
        <p className="border-l-2 border-ouro bg-marfim-100 px-3 py-2 text-sm">{erro}</p>
      )}

      <button type="submit" className="btn btn-principal" disabled={aEnviar}>
        {aEnviar ? "A marcar…" : "Confirmar marcação"}
      </button>
    </form>
  );
}

function formatarData(iso: string) {
  const d = parseDay(iso);
  return `${DIAS_SEMANA[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}
