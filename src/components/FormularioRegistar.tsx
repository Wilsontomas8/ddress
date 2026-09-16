"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FormularioRegistar() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAEnviar(true);
    try {
      const r = await fetch("/api/auth/registar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, telefone, password }),
      });
      const dados = await r.json();
      if (!r.ok) {
        setErro(dados.erro ?? "Não foi possível criar a conta.");
        return;
      }
      router.push("/conta");
      router.refresh();
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <form onSubmit={submeter} className="cartao p-8">
      <h1 className="font-display text-2xl">Criar conta</h1>
      <p className="mt-2 text-sm text-tinta-70">
        Com conta, acompanha os pedidos e as provas sem ter de ligar para a loja.
      </p>

      <label className="mt-6 block">
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

      <label className="mt-4 block">
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

      <label className="mt-4 block">
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
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <span className="mt-1 block text-xs text-tinta-50">Mínimo 6 caracteres.</span>
      </label>

      {erro && (
        <p className="mt-4 border-l-2 border-vinho bg-areia-100 px-3 py-2 text-sm">{erro}</p>
      )}

      <button type="submit" className="btn btn-principal mt-6 w-full" disabled={aEnviar}>
        {aEnviar ? "A criar…" : "Criar conta"}
      </button>

      <p className="mt-4 text-center text-sm text-tinta-70">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-vinho underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </form>
  );
}
