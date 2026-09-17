"use client";

import { useId, useRef, useState } from "react";
import { Upload } from "lucide-react";

/**
 * Escolhe um ficheiro do computador, carrega-o e escreve o endereço no
 * campo indicado. Quem preferir continua a poder colar um endereço à mão.
 */
export default function CarregarFicheiro({
  area,
  campo,
  aceita = "image/*",
  texto = "Carregar do computador",
  aoCarregar,
}: {
  /** Área de permissões: produtos, colecoes, conteudos, parceiros, pedidos… */
  area: string;
  /** Nome do campo do formulário que recebe o endereço */
  campo?: string;
  aceita?: string;
  texto?: string;
  aoCarregar?: (url: string) => void;
}) {
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);

  async function enviar(ficheiro: File) {
    setErro(null);
    setACarregar(true);
    try {
      const corpo = new FormData();
      corpo.set("area", area);
      corpo.set("ficheiro", ficheiro);
      const r = await fetch("/api/admin/ficheiros", { method: "POST", body: corpo });
      const j = await r.json();
      if (!r.ok) {
        setErro(j.erro ?? "Não foi possível carregar.");
        return;
      }
      setFeito(j.url);
      aoCarregar?.(j.url);
      if (campo) {
        // Dentro do próprio formulário, para não escrever no campo de outro
        const formulario = entrada.current?.closest("form");
        const destino =
          formulario?.querySelector<HTMLInputElement>(`[name="${campo}"]`) ??
          document.querySelector<HTMLInputElement>(`[name="${campo}"]`);
        if (destino) {
          destino.value = j.url;
          destino.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setACarregar(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input
        ref={entrada}
        id={id}
        type="file"
        accept={aceita}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) enviar(f);
        }}
      />
      <label htmlFor={id} className="btn btn-contorno cursor-pointer text-xs">
        <Upload className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
        {aCarregar ? "A carregar…" : texto}
      </label>
      {feito && !erro && (
        <span className="text-xs text-verde" role="status">
          Carregado.
        </span>
      )}
      {erro && (
        <span className="max-w-xs text-xs text-rubi" role="alert">
          {erro}
        </span>
      )}
    </span>
  );
}
