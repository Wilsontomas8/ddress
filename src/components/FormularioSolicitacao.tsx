"use client";

import { useState } from "react";
import EscolherSapatos from "./EscolherSapatos";

type Parceiro = { id: string; name: string };

/**
 * Solicitação avulsa: maquilhagem com uma parceira, ou sapatos (escolhidos
 * ou a pedir sugestão). A loja e a parceira são avisadas.
 */
export default function FormularioSolicitacao({
  tipo,
  parceiros = [],
  cliente,
}: {
  tipo: "MAQUILHAGEM" | "SAPATOS";
  parceiros?: Parceiro[];
  cliente?: { nome: string; telefone: string; email: string } | null;
}) {
  const [parceiroId, setParceiroId] = useState(parceiros[0]?.id ?? "");
  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [telefone, setTelefone] = useState(cliente?.telefone ?? "");
  const [email, setEmail] = useState(cliente?.email ?? "");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [local, setLocal] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [notas, setNotas] = useState("");
  const [sapatos, setSapatos] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  const hoje = new Date().toISOString().slice(0, 10);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAEnviar(true);
    try {
      const r = await fetch("/api/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, parceiroId, nome, telefone, email, data, hora, local, tamanho, notas, produtos: sapatos }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErro(j.erro ?? "Não foi possível enviar.");
        return;
      }
      setCodigo(j.codigo);
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setAEnviar(false);
    }
  }

  if (codigo) {
    return (
      <div className="cartao p-8 text-center" role="status">
        <p className="rotulo text-ouro-escuro">Solicitação enviada</p>
        <p className="num mt-3 font-display text-4xl">{codigo}</p>
        <p className="mx-auto mt-4 max-w-md text-sm text-tinta-70">
          Obrigado, {nome.split(" ")[0]}. A DDRESS{tipo === "MAQUILHAGEM" ? " e a nossa parceira" : ""} vão contactá-la pelo {telefone}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="cartao space-y-5 p-6 sm:p-8" noValidate>
      {tipo === "MAQUILHAGEM" && parceiros.length > 1 && (
        <label className="block">
          <span className="etiqueta">Maquilhadora</span>
          <select className="campo" value={parceiroId} onChange={(e) => setParceiroId(e.target.value)} required>
            {parceiros.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="etiqueta">Nome completo</span>
          <input className="campo" name="nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </label>
        <label className="block">
          <span className="etiqueta">Telefone</span>
          <input className="campo" name="telefone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+244 923 000 000" value={telefone} onChange={(e) => setTelefone(e.target.value)} required />
        </label>
        <label className="block">
          <span className="etiqueta">E-mail (opcional)</span>
          <input className="campo" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
      </div>

      {tipo === "MAQUILHAGEM" ? (
        <div className="grid gap-5 sm:grid-cols-3">
          <label className="block">
            <span className="etiqueta">Dia do evento</span>
            <input className="campo" type="date" min={hoje} value={data} onChange={(e) => setData(e.target.value)} required />
          </label>
          <label className="block">
            <span className="etiqueta">Hora (opcional)</span>
            <input className="campo" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </label>
          <label className="block">
            <span className="etiqueta">Local (opcional)</span>
            <input className="campo" placeholder="Talatona, Luanda…" value={local} onChange={(e) => setLocal(e.target.value)} />
          </label>
        </div>
      ) : (
        <>
          <label className="block max-w-40">
            <span className="etiqueta">Tamanho</span>
            <input className="campo" inputMode="numeric" placeholder="38" value={tamanho} onChange={(e) => setTamanho(e.target.value)} />
          </label>
          <div>
            <p className="etiqueta">Modelos que lhe interessam (opcional)</p>
            <EscolherSapatos escolhidos={sapatos} onChange={setSapatos} />
          </div>
        </>
      )}

      <label className="block">
        <span className="etiqueta">{tipo === "MAQUILHAGEM" ? "Tipo de maquilhagem, vestido, penteado…" : "O que procura? A loja sugere modelos"}</span>
        <textarea className="campo min-h-24" value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={1000} />
      </label>

      {erro && (
        <p className="text-sm text-rubi" role="alert">
          {erro}
        </p>
      )}

      <button type="submit" className="btn btn-principal w-full sm:w-auto" disabled={aEnviar}>
        {aEnviar ? "A enviar…" : tipo === "MAQUILHAGEM" ? "Enviar pedido de maquilhagem" : "Pedir sapatos"}
      </button>
    </form>
  );
}
