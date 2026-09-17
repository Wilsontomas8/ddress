/**
 * Vídeo e slides da página inicial.
 *
 * O vídeo corre por trás de todos os slides; os slides trocam o texto e as
 * acções por cima dele.
 *
 * Trocar o vídeo: colocar o novo ficheiro em public/video/ (MP4 H.264, sem
 * som, até ~10 MB) e a imagem do primeiro fotograma (JPG), e actualizar
 * VIDEO_INICIO. Ver public/video/LEIA-ME.md.
 *
 * Fase 2: vídeo e slides passam a ser geridos no painel (banners).
 */

export type VideoDeFundo = {
  src: string;
  /** Imagem mostrada enquanto o vídeo carrega, ou em poupança de dados */
  poster: string;
  /** Vídeo gravado na vertical (telemóvel/Instagram) */
  vertical: boolean;
};

export type Slide = {
  id: string;
  rotulo: string;
  /** Linhas do título. A última termina em ponto final. */
  titulo: string[];
  texto: string;
  principal: { href: string; texto: string };
  secundaria?: { href: string; texto: string };
};

export const VIDEO_INICIO: VideoDeFundo = {
  src: "/video/ddress-colecao.mp4",
  poster: "/video/ddress-colecao.jpg",
  vertical: true,
};

export const SLIDES_INICIO: Slide[] = [
  {
    id: "colecao",
    rotulo: "Luanda · Venda e aluguer de vestidos",
    titulo: ["Vista a peça", "certa."],
    texto:
      "Vestidos de cerimónia e peças do dia-a-dia para mulher, homem e criança. Compre, ou alugue e experimente primeiro no ateliê.",
    principal: { href: "/loja", texto: "Ver a colecção" },
    secundaria: { href: "/loja?tipo=aluguer", texto: "Peças para alugar" },
  },
  {
    id: "aluguer",
    rotulo: "Aluguer por dia ou fim-de-semana",
    titulo: ["Para um dia.", "Sem compromisso."],
    texto: "Cada peça tem o seu calendário. Escolhe as datas, vê o valor na hora e levanta no dia combinado.",
    principal: { href: "/loja?tipo=aluguer", texto: "Escolher datas" },
    secundaria: { href: "/como-funciona", texto: "Como funciona" },
  },
  {
    id: "atelie",
    rotulo: "Prova no ateliê com hora marcada",
    titulo: ["Prove antes.", "Leve depois."],
    texto: "Marque a prova da peça que escolheu. Só aparecem as horas em que ela está no ateliê à sua espera.",
    principal: { href: "/marcacao", texto: "Marcar prova" },
  },
];
