"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function FormularioEntrar() {
  const router = useRouter();
  const params = useSearchParams();
  const destino = params.get("destino");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAEnviar(true);
    try {
      const r = await fetch("/api/auth/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const dados = await r.json();
      if (!r.ok) {
        setErro(dados.erro ?? "Não foi possível entrar.");
        return;
      }
      const equipa = dados.role === "ADMIN" || dados.role === "FUNCIONARIO";
      router.push(destino ?? (equipa ? "/admin" : "/conta"));
      router.refresh();
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <form onSubmit={submeter} className="cartao p-8">
      <h1 className="font-display text-2xl">Entrar</h1>
      <p className="mt-2 text-sm text-tinta-70">
        Aceda aos seus pedidos, alugueres e provas marcadas.
      </p>

      <label className="mt-6 block">
        <span className="etiqueta">E-mail</span>
        <input
          type="email"
          className="campo"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>

      <label className="mt-4 block">
        <span className="etiqueta">Palavra-passe</span>
        <input
          type="password"
          className="campo"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>

      {erro && (
        <p className="mt-4 border-l-2 border-vinho bg-areia-100 px-3 py-2 text-sm">{erro}</p>
      )}

      <button type="submit" className="btn btn-principal mt-6 w-full" disabled={aEnviar}>
        {aEnviar ? "A entrar…" : "Entrar"}
      </button>

      <p className="mt-4 text-center text-sm text-tinta-70">
        Ainda não tem conta?{" "}
        <Link href="/registar" className="text-vinho underline underline-offset-4">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
