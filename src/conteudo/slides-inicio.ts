/**
 * Slides do vídeo da página inicial.
 *
 * Para usar os vídeos da DDRESS basta colocar os ficheiros em
 * public/video/ com estes nomes (MP4 H.264, 1920×1080, sem som, até ~8 MB
 * cada) e preencher `video`. Enquanto o vídeo não existe, o slide mostra a
 * imagem com um movimento lento de câmara, para não haver ecrã vazio.
 *
 * Fase 2: estes slides passam a ser geridos no painel (banners).
 */

export type Slide = {
  id: string;
  /** "/video/ddress-colecao.mp4" — opcional */
  video?: string;
  /** Imagem de recurso e primeira imagem do vídeo */
  imagem: string;
  /** Enquadramento da imagem quando não há vídeo: ponto focal e zoom */
  enquadramento?: { posicao: string; escala: number };
  /** Em ecrãs largos, encosta a imagem à direita para libertar o texto */
  encostarDireita?: boolean;
  rotulo: string;
  /** Linhas do título. A última termina em ponto final. */
  titulo: string[];
  texto: string;
  principal: { href: string; texto: string };
  secundaria?: { href: string; texto: string };
};

export const SLIDES_INICIO: Slide[] = [
  {
    id: "marca",
    video: "/video/ddress-marca.mp4",
    imagem: "/marca/ddress-logo-fundo-preto.jpg",
    enquadramento: { posicao: "50% 45%", escala: 1 },
    encostarDireita: true,
    rotulo: "Luanda · Venda e aluguer de vestidos",
    titulo: ["Vista a peça", "certa."],
    texto: "Vestidos de cerimónia e peças do dia-a-dia para mulher, homem e criança. Compre, ou alugue e experimente primeiro no ateliê.",
    principal: { href: "/loja", texto: "Ver a colecção" },
    secundaria: { href: "/loja?tipo=aluguer", texto: "Peças para alugar" },
  },
  {
    id: "aluguer",
    video: "/video/ddress-aluguer.mp4",
    imagem: "/marca/ddress-logo-fundo-preto.jpg",
    enquadramento: { posicao: "0% 0%", escala: 2.4 },
    rotulo: "Aluguer por dia ou fim-de-semana",
    titulo: ["Para um dia.", "Sem compromisso."],
    texto: "Cada peça tem o seu calendário. Escolhe as datas, vê o valor na hora e levanta no dia combinado.",
    principal: { href: "/loja?tipo=aluguer", texto: "Escolher datas" },
    secundaria: { href: "/como-funciona", texto: "Como funciona" },
  },
  {
    id: "atelie",
    video: "/video/ddress-atelie.mp4",
    imagem: "/marca/ddress-logo-fundo-preto.jpg",
    enquadramento: { posicao: "100% 0%", escala: 2.4 },
    rotulo: "Prova no ateliê com hora marcada",
    titulo: ["Prove antes.", "Leve depois."],
    texto: "Marque a prova da peça que escolheu. Só aparecem as horas em que ela está no ateliê à sua espera.",
    principal: { href: "/marcacao", texto: "Marcar prova" },
  },
];
