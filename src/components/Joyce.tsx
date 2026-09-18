"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { responderDaJoyce, SUGESTOES_DA_JOYCE, type DadosDaLoja } from "@/lib/joyce";
import { ligacaoWhatsApp } from "@/lib/whatsapp";

type Mensagem = {
  id: number;
  de: "joyce" | "cliente";
  texto: string;
  ligacoes?: { texto: string; href: string }[];
};

/**
 * Assistente comercial da loja. Responde do que a DDRESS tem guardado e,
 * quando não sabe, passa a conversa para uma pessoa no WhatsApp. A conversa
 * fica só neste separador (sessionStorage) e não sai do navegador.
 */
export default function Joyce({ loja, saudacao }: { loja: DadosDaLoja; saudacao: string }) {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [ultimaPergunta, setUltimaPergunta] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  const fim = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const contador = useRef(0);

  const proximoId = () => ++contador.current;

  // Retoma a conversa deste separador; à primeira, a Joyce cumprimenta.
  useEffect(() => {
    let guardadas: Mensagem[] = [];
    try {
      guardadas = JSON.parse(sessionStorage.getItem("ddress-joyce") ?? "[]");
    } catch {
      guardadas = [];
    }
    if (guardadas.length) {
      contador.current = guardadas[guardadas.length - 1]?.id ?? 0;
      setMensagens(guardadas);
    } else {
      setMensagens([{ id: proximoId(), de: "joyce", texto: saudacao }]);
    }
  }, [saudacao]);

  useEffect(() => {
    if (mensagens.length === 0) return;
    try {
      sessionStorage.setItem("ddress-joyce", JSON.stringify(mensagens.slice(-40)));
    } catch {
      /* navegação privada: a conversa fica só em memória */
    }
    if (aberto) fim.current?.scrollIntoView({ block: "end" });
  }, [mensagens, aberto]);

  useEffect(() => {
    if (aberto) campo.current?.focus();
    else botao.current?.focus({ preventScroll: true });
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  function perguntar(pergunta: string) {
    const limpa = pergunta.trim();
    if (!limpa) return;
    setUltimaPergunta(limpa);
    const r = responderDaJoyce(limpa, loja);
    setMensagens((antes) => [
      ...antes,
      { id: proximoId(), de: "cliente", texto: limpa },
      { id: proximoId(), de: "joyce", texto: r.texto, ligacoes: r.ligacoes },
    ]);
    setTexto("");
  }

  const whatsapp = ligacaoWhatsApp(
    loja.whatsapp,
    ultimaPergunta
      ? `Olá! Vim do site da DDRESS. A minha dúvida: ${ultimaPergunta}`
      : "Olá! Vim do site da DDRESS e gostaria de falar convosco."
  );

  return (
    <>
      <button
        ref={botao}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls="conversa-joyce"
        className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-ouro px-4 py-3 text-sm font-medium text-preto shadow-lg transition-transform hover:scale-[1.02] sm:right-6 sm:bottom-6 print:hidden"
      >
        {aberto ? <X className="h-5 w-5" strokeWidth={1.8} /> : <MessageCircle className="h-5 w-5" strokeWidth={1.8} />}
        <span className={aberto ? "sr-only" : ""}>Falar com a {loja.assistente}</span>
      </button>

      {aberto && (
        <div
          id="conversa-joyce"
          role="dialog"
          aria-label={`Conversa com a ${loja.assistente}, assistente comercial`}
          className="fixed inset-x-3 bottom-20 z-40 flex max-h-[min(34rem,78svh)] flex-col overflow-hidden bg-superficie shadow-2xl ring-1 ring-marfim-200 sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[24rem] print:hidden"
        >
          <div className="flex items-center gap-3 bg-preto px-4 py-3 text-marfim-50">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-ouro-claro),var(--color-ouro))] text-sm font-semibold text-preto"
            >
              {loja.assistente.slice(0, 1)}
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-medium">{loja.assistente}</span>
              <span className="block text-xs text-marfim-400">Assistente comercial · {loja.nomeDaLoja}</span>
            </span>
            <button type="button" onClick={() => setAberto(false)} className="ml-auto p-1 text-marfim-200 hover:text-marfim-50" aria-label="Fechar conversa">
              <X className="h-5 w-5" strokeWidth={1.6} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {mensagens.map((m) => (
              <div key={m.id} className={m.de === "cliente" ? "text-right" : ""}>
                <p
                  className={`inline-block max-w-[85%] px-3 py-2 text-left text-sm leading-relaxed ${
                    m.de === "cliente" ? "bg-preto text-marfim-50" : "bg-marfim-100 text-tinta"
                  }`}
                >
                  {m.texto}
                </p>
                {m.ligacoes && m.ligacoes.length > 0 && (
                  <span className="mt-2 flex flex-wrap gap-2">
                    {m.ligacoes.map((l) =>
                      l.href.startsWith("http") ? (
                        <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="chip text-xs">
                          {l.texto}
                        </a>
                      ) : (
                        <Link key={l.href} href={l.href} className="chip text-xs" onClick={() => setAberto(false)}>
                          {l.texto}
                        </Link>
                      )
                    )}
                  </span>
                )}
              </div>
            ))}
            <div ref={fim} />
          </div>

          {mensagens.length <= 1 && (
            <div className="sem-barra flex gap-2 overflow-x-auto border-t border-marfim-200 px-4 py-3">
              {SUGESTOES_DA_JOYCE.map((s) => (
                <button key={s} type="button" className="chip shrink-0 text-xs" onClick={() => perguntar(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              perguntar(texto);
            }}
            className="flex items-center gap-2 border-t border-marfim-200 px-3 py-3"
          >
            <label className="sr-only" htmlFor="pergunta-joyce">
              Escreva a sua pergunta
            </label>
            <input
              ref={campo}
              id="pergunta-joyce"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreva aqui…"
              autoComplete="off"
              className="campo py-2 text-sm"
            />
            <button type="submit" className="btn btn-principal px-3 py-2" aria-label="Enviar">
              <Send className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </form>

          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noreferrer" className="border-t border-marfim-200 px-4 py-2.5 text-center text-xs text-tinta-70 hover:text-ouro-escuro">
              Prefere falar com uma pessoa? Continuar no WhatsApp
            </a>
          )}
        </div>
      )}
    </>
  );
}
