"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Slide } from "@/conteudo/slides-inicio";

const DURACAO_MS = 8000;

/**
 * Vídeo de página inteira da página inicial, em slides.
 *
 * Cada slide tenta tocar o seu vídeo; se o ficheiro ainda não existir,
 * fica a imagem de recurso com um movimento lento de câmara. Passa sozinho
 * a cada 8 segundos, pode ser pausado, e não se mexe para quem pediu
 * movimento reduzido no sistema.
 */
export default function HeroInicio({ slides }: { slides: Slide[] }) {
  const [actual, setActual] = useState(0);
  const [emPausa, setEmPausa] = useState(false);
  const [videoPronto, setVideoPronto] = useState<Record<string, boolean>>({});
  const videos = useRef<Record<string, HTMLVideoElement | null>>({});
  const total = slides.length;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setEmPausa(true);
  }, []);

  const irPara = useCallback((i: number) => setActual((i + total) % total), [total]);

  // Avança sozinho
  useEffect(() => {
    if (emPausa || total < 2) return;
    const t = window.setTimeout(() => irPara(actual + 1), DURACAO_MS);
    return () => window.clearTimeout(t);
  }, [actual, emPausa, irPara, total]);

  // Só o vídeo do slide visível está a tocar
  useEffect(() => {
    slides.forEach((s, i) => {
      const v = videos.current[s.id];
      if (!v) return;
      if (i === actual && !emPausa) {
        v.currentTime = 0;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [actual, emPausa, slides]);

  const slide = slides[actual];

  return (
    <section
      className="relative isolate h-[100svh] min-h-[36rem] overflow-hidden bg-preto text-marfim-50"
      aria-roledescription="carrossel"
      aria-label="Destaques DDRESS"
    >
      {/* ------------------------------------------------ fundos */}
      {slides.map((s, i) => {
        const visivel = i === actual;
        const enq = s.enquadramento ?? { posicao: "50% 50%", escala: 1 };
        return (
          <div
            key={s.id}
            className={`absolute inset-0 -z-10 transition-opacity duration-[1200ms] ${visivel ? "opacity-100" : "opacity-0"}`}
            aria-hidden={!visivel}
          >
            <div
              className={`absolute inset-0 overflow-hidden ${
                s.encostarDireita
                  ? "max-lg:top-28 max-lg:bottom-[50%] lg:left-[36%] [mask-image:radial-gradient(ellipse_62%_58%_at_55%_50%,#000_58%,transparent_100%)]"
                  : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={visivel ? `${s.id}-${actual}` : s.id}
                src={s.imagem}
                alt=""
                className={`h-full w-full object-cover ${s.encostarDireita ? "object-contain" : ""} ${visivel && !emPausa ? "efeito-aproximar" : ""}`}
                style={{
                  objectPosition: enq.posicao,
                  transformOrigin: enq.posicao,
                  scale: String(enq.escala),
                }}
              />
            </div>
            {s.video && (
              <video
                ref={(el) => {
                  videos.current[s.id] = el;
                }}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                  videoPronto[s.id] ? "opacity-100" : "opacity-0"
                }`}
                src={s.video}
                muted
                loop
                playsInline
                preload={i === 0 ? "auto" : "metadata"}
                onCanPlay={() => setVideoPronto((m) => ({ ...m, [s.id]: true }))}
                onError={() => setVideoPronto((m) => ({ ...m, [s.id]: false }))}
              />
            )}
          </div>
        );
      })}

      {/* Véu para a leitura do texto: mais escuro em baixo, à esquerda */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(10_10_10/0.55)_0%,rgb(10_10_10/0)_28%,rgb(10_10_10/0.15)_55%,rgb(10_10_10/0.88)_100%)]"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(10_10_10/0.7)_0%,rgb(10_10_10/0)_60%)]" />

      {/* ------------------------------------------------ texto */}
      <div className="mx-auto flex h-full max-w-[90rem] flex-col justify-end px-4 pb-28 sm:px-8 sm:pb-32">
        <div key={slide.id} className="max-w-4xl" aria-live={emPausa ? "polite" : "off"}>
          <p className="rotulo efeito-surgir text-ouro-claro">{slide.rotulo}</p>
          <h1 className="efeito-surgir mt-5 font-display text-[clamp(3.1rem,9vw,8.5rem)] leading-[0.92] tracking-[-0.03em] [animation-delay:80ms]">
            {slide.titulo.map((linha, i) => (
              <span key={i} className={`block ${i === slide.titulo.length - 1 ? "italic texto-ouro pb-2" : ""}`}>
                {linha}
                {i < slide.titulo.length - 1 && " "}
              </span>
            ))}
          </h1>
          <p className="efeito-surgir mt-6 max-w-xl text-base leading-relaxed text-marfim-100/85 [animation-delay:160ms] sm:text-lg">
            {slide.texto}
          </p>
          <div className="efeito-surgir mt-9 flex flex-wrap gap-3 [animation-delay:240ms]">
            <Link href={slide.principal.href} className="btn btn-principal">
              {slide.principal.texto}
            </Link>
            {slide.secundaria && (
              <Link href={slide.secundaria.href} className="btn btn-contorno-claro">
                {slide.secundaria.texto}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ controlos */}
      {total > 1 && (
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto flex max-w-[90rem] items-center gap-4 px-4 pb-8 sm:px-8">
            <p className="num rotulo text-marfim-200" aria-hidden="true">
              {String(actual + 1).padStart(2, "0")} <span className="text-marfim-400">/ {String(total).padStart(2, "0")}</span>
            </p>

            <div className="flex flex-1 gap-2" role="group" aria-label="Escolher slide">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => irPara(i)}
                  className="group relative h-6 flex-1 sm:max-w-24"
                  aria-label={`Slide ${i + 1} de ${total}: ${s.rotulo}`}
                  aria-current={i === actual}
                >
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-marfim-50/30 group-hover:bg-marfim-50/60" />
                  {i === actual && (
                    <span
                      key={`${actual}-${emPausa}`}
                      className="absolute inset-x-0 top-1/2 h-px origin-left -translate-y-1/2 bg-ouro-claro"
                      style={emPausa ? undefined : { animation: `progresso ${DURACAO_MS}ms linear both` }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button type="button" className="rounded-full p-2 text-marfim-100 hover:bg-white/10" onClick={() => irPara(actual - 1)} aria-label="Slide anterior">
                <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
              </button>
              <button type="button" className="rounded-full p-2 text-marfim-100 hover:bg-white/10" onClick={() => setEmPausa((v) => !v)} aria-label={emPausa ? "Retomar" : "Pausar"}>
                {emPausa ? <Play className="h-4 w-4" strokeWidth={1.5} /> : <Pause className="h-4 w-4" strokeWidth={1.5} />}
              </button>
              <button type="button" className="rounded-full p-2 text-marfim-100 hover:bg-white/10" onClick={() => irPara(actual + 1)} aria-label="Slide seguinte">
                <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
