"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Nova palavra-passe, a partir da ligação recebida por e-mail. */
export default function FormularioRedefinir({ codigo }: { codigo: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (password !== repetir) {
      setErro("As duas palavras-passe não são iguais.");
      return;
    }
    setAGuardar(true);
    try {
      const r = await fetch("/api/auth/redefinir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, password }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErro(j.erro ?? "Não foi possível guardar.");
        return;
      }
      setPronto(true);
      setTimeout(() => router.push("/entrar"), 2500);
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setAGuardar(false);
    }
  }

  if (pronto) {
    return (
      <div className="cartao p-8 text-center" role="status">
        <p className="rotulo text-ouro-escuro">Palavra-passe guardada</p>
        <p className="mt-3 text-tinta-70">Já pode entrar com a palavra-passe nova. A levá-la para a entrada…</p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="cartao space-y-5 p-8" noValidate>
      <label className="block">
        <span className="etiqueta">Nova palavra-passe</span>
        <input
          className="campo"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
        <span className="mt-1.5 block text-xs text-tinta-50">Pelo menos 8 caracteres.</span>
      </label>

      <label className="block">
        <span className="etiqueta">Repita a palavra-passe</span>
        <input
          className="campo"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={repetir}
          onChange={(e) => setRepetir(e.target.value)}
          required
        />
      </label>

      {erro && (
        <p className="text-sm text-rubi" role="alert">
          {erro}
        </p>
      )}

      <button type="submit" className="btn btn-principal w-full" disabled={aGuardar}>
        {aGuardar ? "A guardar…" : "Guardar palavra-passe"}
      </button>
    </form>
  );
}
