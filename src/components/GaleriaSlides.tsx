"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

type Imagem = { url: string; titulo?: string };

/**
 * Slideshow de fotografias (Quem somos, colecções). Passa sozinho a cada
 * 5 segundos, com pausa, setas, miniaturas e teclado; não se mexe para
 * quem pediu movimento reduzido.
 */
export default function GaleriaSlides({ imagens, rotulo, proporcao = "aspect-[4/5]" }: { imagens: Imagem[]; rotulo: string; proporcao?: string }) {
  const [actual, setActual] = useState(0);
  const [emPausa, setEmPausa] = useState(false);
  const total = imagens.length;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setEmPausa(true);
  }, []);

  const irPara = useCallback((i: number) => setActual((i + total) % total), [total]);

  useEffect(() => {
    if (emPausa || total < 2) return;
    const t = window.setTimeout(() => irPara(actual + 1), 5000);
    return () => window.clearTimeout(t);
  }, [actual, emPausa, irPara, total]);

  if (total === 0) return null;

  return (
    <div
      aria-roledescription="carrossel"
      aria-label={rotulo}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") irPara(actual - 1);
        if (e.key === "ArrowRight") irPara(actual + 1);
      }}
    >
      <div className={`relative overflow-hidden bg-preto ${proporcao}`}>
        {imagens.map((im, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={im.url}
            src={im.url}
            alt={im.titulo || `${rotulo} — fotografia ${i + 1} de ${total}`}
            loading={i === 0 ? "eager" : "lazy"}
            aria-hidden={i !== actual}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${i === actual ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        {total > 1 && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-[linear-gradient(180deg,transparent,rgb(10_10_10/0.7))] px-4 pt-12 pb-3 text-marfim-50">
            <p className="num rotulo text-[0.625rem]" aria-live={emPausa ? "polite" : "off"}>
              {String(actual + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => irPara(actual - 1)} className="rounded-full p-2 hover:bg-white/10" aria-label="Fotografia anterior">
                <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
              </button>
              <button type="button" onClick={() => setEmPausa((v) => !v)} className="rounded-full p-2 hover:bg-white/10" aria-label={emPausa ? "Retomar" : "Pausar"}>
                {emPausa ? <Play className="h-4 w-4" strokeWidth={1.5} /> : <Pause className="h-4 w-4" strokeWidth={1.5} />}
              </button>
              <button type="button" onClick={() => irPara(actual + 1)} className="rounded-full p-2 hover:bg-white/10" aria-label="Fotografia seguinte">
                <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}
      </div>

      {total > 1 && (
        <div className="sem-barra mt-3 flex gap-2 overflow-x-auto" role="group" aria-label="Escolher fotografia">
          {imagens.map((im, i) => (
            <button
              key={im.url}
              type="button"
              onClick={() => irPara(i)}
              aria-label={`Ver fotografia ${i + 1}`}
              aria-current={i === actual}
              className={`h-16 w-12 shrink-0 overflow-hidden transition-opacity ${i === actual ? "opacity-100 ring-1 ring-ouro" : "opacity-50 hover:opacity-90"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
