"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Slide, VideoDeFundo } from "@/conteudo/slides-inicio";

const DURACAO_MS = 8000;

type Props = {
  slides: Slide[];
  video: VideoDeFundo;
};

/**
 * Vídeo de página inteira da página inicial, com os slides por cima.
 *
 * · Telemóvel: o vídeo (vertical) ocupa o ecrã todo.
 * · Computador: o vídeo aparece nítido num painel vertical à direita e uma
 *   cópia desfocada preenche o fundo, para não esticar nem pixelizar.
 *
 * Os textos passam sozinhos a cada 8 segundos e podem ser pausados. Quem
 * pediu movimento reduzido, ou tem poupança de dados ligada, vê a imagem
 * parada em vez do vídeo.
 */
export default function HeroInicio({ slides, video }: Props) {
  const [actual, setActual] = useState(0);
  const [emPausa, setEmPausa] = useState(false);
  const [mostrarVideo, setMostrarVideo] = useState(false);
  const [largo, setLargo] = useState(false);
  const [videoPronto, setVideoPronto] = useState(false);
  const videos = useRef<Set<HTMLVideoElement>>(new Set());
  const total = slides.length;

  // Decide depois de montar: o HTML do servidor só traz a imagem, que
  // aparece logo; o vídeo só descarrega quando faz sentido.
  useEffect(() => {
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ligacao = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const poupanca = !!ligacao?.saveData || /(^|-)2g$/.test(ligacao?.effectiveType ?? "");
    if (reduzido) setEmPausa(true);
    setMostrarVideo(!reduzido && !poupanca);

    const mq = window.matchMedia("(min-width: 1024px)");
    const aoMudar = () => setLargo(mq.matches);
    aoMudar();
    mq.addEventListener?.("change", aoMudar);
    return () => mq.removeEventListener?.("change", aoMudar);
  }, []);

  const irPara = useCallback((i: number) => setActual((i + total) % total), [total]);

  useEffect(() => {
    if (emPausa || total < 2) return;
    const t = window.setTimeout(() => irPara(actual + 1), DURACAO_MS);
    return () => window.clearTimeout(t);
  }, [actual, emPausa, irPara, total]);

  // Pausar os textos pausa também o vídeo
  useEffect(() => {
    for (const v of videos.current) {
      if (emPausa) v.pause();
      else v.play()?.catch(() => {});
    }
  }, [emPausa, mostrarVideo, largo]);

  const registar = useCallback((el: HTMLVideoElement | null) => {
    if (el) videos.current.add(el);
  }, []);

  const slide = slides[actual];
  const classeVideo = `absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${videoPronto ? "opacity-100" : "opacity-0"}`;
  const propsVideo = {
    src: video.src,
    poster: video.poster,
    muted: true,
    loop: true,
    playsInline: true,
    autoPlay: !emPausa,
    preload: "auto" as const,
    "aria-hidden": true,
    ref: registar,
    onCanPlay: () => setVideoPronto(true),
  };

  return (
    <section
      className="relative isolate h-[100svh] min-h-[38rem] overflow-hidden bg-preto text-marfim-50"
      aria-roledescription="carrossel"
      aria-label="Destaques DDRESS"
    >
      {/* ------------------------------------------------ fundo */}
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover lg:scale-125 lg:blur-3xl lg:brightness-[0.4] lg:saturate-150"
        />
        {mostrarVideo && (
          <video
            key={largo ? "fundo-largo" : "fundo-estreito"}
            {...propsVideo}
            className={`${classeVideo} ${largo ? "scale-125 blur-3xl brightness-[0.4] saturate-150" : ""}`}
          />
        )}
      </div>

      {/* Véus para a leitura: em baixo no telemóvel, à esquerda no computador */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(10_10_10/0.55)_0%,rgb(10_10_10/0)_22%,rgb(10_10_10/0.5)_45%,rgb(10_10_10/0.95)_100%)] lg:bg-[linear-gradient(90deg,rgb(10_10_10/0.85)_0%,rgb(10_10_10/0.35)_55%,rgb(10_10_10/0.1)_100%)]"
      />

      {/* painel vertical nítido (computador) */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
        <div className="mx-auto flex h-full max-w-[90rem] items-center justify-end px-8 pt-28 pb-24">
          <div className="relative aspect-[9/16] h-full max-h-[52rem] overflow-hidden bg-carvao shadow-[0_40px_120px_-30px_rgb(0_0_0/0.8)] ring-1 ring-ouro/35">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={video.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
            {mostrarVideo && largo && <video key="painel" {...propsVideo} className={classeVideo} />}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[linear-gradient(180deg,transparent,rgb(10_10_10/0.7))] px-4 pt-10 pb-4">
              <span className="rotulo text-[0.625rem] text-marfim-100">Colecção de cerimónia</span>
              <span className="h-px w-10 bg-ouro-claro" />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ texto */}
      <div className="mx-auto flex h-full max-w-[90rem] flex-col justify-end px-4 pb-28 sm:px-8 sm:pb-32 lg:justify-center lg:pt-16 lg:pb-16">
        <div key={slide.id} className="max-w-4xl lg:max-w-[58%]" aria-live={emPausa ? "polite" : "off"}>
          <p className="rotulo efeito-surgir text-ouro-claro">{slide.rotulo}</p>
          <h1 className="efeito-surgir mt-5 font-display text-[clamp(3.1rem,7.4vw,7.5rem)] leading-[0.92] tracking-[-0.03em] [animation-delay:80ms]">
            {slide.titulo.map((linha, i) => (
              <span key={i} className={`block ${i === slide.titulo.length - 1 ? "texto-ouro pb-2 italic" : ""}`}>
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
          <div className="mx-auto flex max-w-[90rem] items-center gap-4 px-4 pb-8 sm:px-8 lg:max-w-[90rem] lg:pr-[42%] xl:pr-[38%]">
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
              <button
                type="button"
                className="rounded-full p-2 text-marfim-100 hover:bg-white/10"
                onClick={() => setEmPausa((v) => !v)}
                aria-label={emPausa ? "Retomar" : "Pausar"}
              >
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
