"use client";

import { useState } from "react";

/** Inscrição na newsletter, no rodapé. Sempre com autorização explícita. */
export default function FormularioNewsletter() {
  const [email, setEmail] = useState("");
  const [autoriza, setAutoriza] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!autoriza) {
      setErro("Precisamos da sua autorização para lhe escrever.");
      return;
    }
    setAEnviar(true);
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consentimento: true, origem: "site" }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErro(j.erro ?? "Não foi possível inscrever.");
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
      <p className="text-sm text-marfim-100" role="status">
        {feito}
      </p>
    );
  }

  return (
    <form onSubmit={enviar} noValidate>
      <label className="block">
        <span className="sr-only">O seu e-mail</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="O seu e-mail"
          required
          className="w-full border border-white/20 bg-transparent px-3 py-2.5 text-sm text-marfim-50 placeholder:text-marfim-400 focus:border-ouro focus:outline-none"
        />
      </label>

      <label className="mt-3 flex items-start gap-2 text-xs leading-snug text-marfim-400">
        <input type="checkbox" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)} className="mt-0.5" />
        <span>Autorizo a DDRESS a enviar-me novidades por e-mail. Posso sair quando quiser.</span>
      </label>

      {erro && (
        <p className="mt-2 text-xs text-rubi" role="alert">
          {erro}
        </p>
      )}

      <button type="submit" className="btn btn-contorno-claro mt-3 w-full" disabled={aEnviar}>
        {aEnviar ? "A inscrever…" : "Receber novidades"}
      </button>
    </form>
  );
}
