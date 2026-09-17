"use client";

import Link from "next/link";
import { useState } from "react";

/** Pedido de nova palavra-passe: só o e-mail. */
export default function FormularioRecuperar() {
  const [email, setEmail] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<{ mensagem: string; semConfiguracao: boolean; ligacao?: string } | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAEnviar(true);
    try {
      const r = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErro(j.erro ?? "Não foi possível tratar o pedido.");
        return;
      }
      setFeito({ mensagem: j.mensagem, semConfiguracao: !!j.semConfiguracao, ligacao: j.ligacao });
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setAEnviar(false);
    }
  }

  if (feito) {
    return (
      <div className="cartao p-8" role="status">
        <p className="rotulo text-ouro-escuro">Pedido registado</p>
        <p className="mt-3 text-tinta-70">{feito.mensagem}</p>
        {feito.semConfiguracao && (
          <p className="mt-4 text-sm text-tinta-50">
            O envio de e-mails da loja ainda não está configurado. Fale connosco pelo WhatsApp e tratamos disto consigo.
          </p>
        )}
        {feito.ligacao && (
          <p className="mt-4 text-sm break-all text-tinta-50">
            Ambiente de testes — ligação:{" "}
            <a className="ligacao" href={feito.ligacao}>
              {feito.ligacao}
            </a>
          </p>
        )}
        <Link href="/entrar" className="btn btn-contorno mt-6">
          Voltar a entrar
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="cartao space-y-5 p-8" noValidate>
      <label className="block">
        <span className="etiqueta">E-mail da conta</span>
        <input
          className="campo"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </label>

      {erro && (
        <p className="text-sm text-rubi" role="alert">
          {erro}
        </p>
      )}

      <button type="submit" className="btn btn-principal w-full" disabled={aEnviar}>
        {aEnviar ? "A enviar…" : "Enviar ligação"}
      </button>

      <p className="text-center text-sm text-tinta-50">
        <Link href="/entrar" className="ligacao">
          Já me lembro da palavra-passe
        </Link>
      </p>
    </form>
  );
}
