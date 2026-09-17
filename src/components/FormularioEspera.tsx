"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";

/**
 * "Avise-me quando estiver livre": aparece na página da peça quando ela
 * está toda alugada. A loja avisa uma vez, quando a peça voltar.
 */
export default function FormularioEspera({
  produtoId,
  varianteId,
  disponivelDe,
  cliente,
}: {
  produtoId: string;
  varianteId?: string | null;
  /** Dia em que a peça deve voltar, para sugerir à cliente */
  disponivelDe?: string | null;
  cliente?: { nome: string; telefone: string; email: string } | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [telefone, setTelefone] = useState(cliente?.telefone ?? "");
  const [email, setEmail] = useState(cliente?.email ?? "");
  const [desde, setDesde] = useState(disponivelDe ?? "");
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAEnviar(true);
    try {
      const r = await fetch("/api/espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId, varianteId: varianteId ?? null, nome, telefone, email, desde }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErro(j.erro ?? "Não foi possível registar.");
        return;
      }
      setFeito(j.mensagem);
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setAEnviar(false);
    }
  }

  if (feito) {
    return (
      <p className="border border-ouro/40 bg-ouro-palido/40 px-4 py-3 text-sm" role="status">
        {feito}
      </p>
    );
  }

  if (!aberto) {
    return (
      <button type="button" className="btn btn-contorno w-full sm:w-auto" onClick={() => setAberto(true)}>
        <BellRing className="mr-2 h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        Avise-me quando estiver livre
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="border border-marfim-200 p-4" noValidate>
      <p className="etiqueta">Avisamos-lhe quando a peça voltar</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="etiqueta">Nome</span>
          <input className="campo" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </label>
        <label className="block">
          <span className="etiqueta">Telefone</span>
          <input className="campo" type="tel" inputMode="tel" autoComplete="tel" placeholder="+244 923 000 000" value={telefone} onChange={(e) => setTelefone(e.target.value)} required />
        </label>
        <label className="block">
          <span className="etiqueta">E-mail (para receber o aviso)</span>
          <input className="campo" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="etiqueta">Preciso dela a partir de (opcional)</span>
          <input className="campo" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
      </div>

      {erro && (
        <p className="mt-3 text-sm text-rubi" role="alert">
          {erro}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="submit" className="btn btn-principal" disabled={aEnviar}>
          {aEnviar ? "A registar…" : "Quero ser avisada"}
        </button>
        <button type="button" className="btn btn-contorno" onClick={() => setAberto(false)}>
          Deixar estar
        </button>
      </div>
    </form>
  );
}
