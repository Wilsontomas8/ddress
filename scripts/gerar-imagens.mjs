/**
 * Gera as imagens de demonstração do catálogo (SVG) em /public/img.
 *
 * São placeholders elegantes — substitua os ficheiros pelas fotografias
 * reais das peças mantendo o mesmo nome, ou carregue novas imagens pelo
 * painel de administração.
 *
 *   node scripts/gerar-imagens.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "public", "img");
mkdirSync(destino, { recursive: true });

/** Silhuetas simples por tipo de peça */
const silhuetas = {
  fato: `<path d="M300 300 L372 256 L450 292 L528 256 L600 300 L642 520 L596 536 L586 900 L314 900 L304 536 L258 520 Z" />
         <path d="M372 256 L450 292 L440 900 L416 900 L400 420 Z" fill="#000" fill-opacity="0.14" stroke="none" />
         <path d="M528 256 L450 292 L460 900 L484 900 L500 420 Z" fill="#000" fill-opacity="0.07" stroke="none" />
         <path d="M450 292 L422 424 L478 424 Z" fill="#fff" fill-opacity="0.55" stroke="none" />
         <circle cx="450" cy="556" r="9" fill="#fff" fill-opacity="0.45" stroke="none" />
         <circle cx="450" cy="636" r="9" fill="#fff" fill-opacity="0.45" stroke="none" />`,
  vestido: `<path d="M340 280 Q450 240 560 280 L580 400 L540 420 L600 900 L300 900 L360 420 L320 400 Z" />
            <path d="M400 280 Q450 340 500 280" fill="none" stroke-width="6" />`,
  camisa: `<path d="M320 292 L400 256 L450 314 L500 256 L580 292 L620 470 L562 492 L562 862 L338 862 L338 492 L280 470 Z" />
           <path d="M398 250 L450 316 L502 250 L474 238 L450 272 L426 238 Z" fill="#fff" fill-opacity="0.5" stroke="none" />
           <path d="M450 314 L450 862" fill="none" stroke-width="5" />
           <circle cx="450" cy="470" r="7" fill="#fff" fill-opacity="0.45" stroke="none" />
           <circle cx="450" cy="580" r="7" fill="#fff" fill-opacity="0.45" stroke="none" />
           <circle cx="450" cy="690" r="7" fill="#fff" fill-opacity="0.45" stroke="none" />`,
  casaco: `<path d="M300 300 L380 255 L450 300 L520 255 L600 300 L650 560 L600 580 L590 900 L310 900 L300 580 L250 560 Z" />
           <path d="M450 300 L450 900" fill="none" stroke-width="6" />
           <circle cx="450" cy="470" r="9" />
           <circle cx="450" cy="560" r="9" />`,
  calcas: `<path d="M350 280 L550 280 L575 900 L480 900 L450 520 L420 900 L325 900 Z" />`,
  conjunto: `<path d="M330 280 L450 250 L570 280 L600 460 L545 475 L545 560 L355 560 L355 475 L300 460 Z" />
             <path d="M360 590 L540 590 L560 900 L480 900 L450 700 L420 900 L340 900 Z" />`,
};

/** Paletas da marca: [fundo1, fundo2, silhueta, acento]
 *  Preto e ouro para as peças de cerimónia; marfim e areia para o
 *  dia-a-dia, de modo a dar respiração à grelha do catálogo. */
const paletas = {
  noite: ["#1A1713", "#0B0A09", "#312B22", "#c9a227"],
  ouro: ["#221C10", "#0E0B06", "#7A5E14", "#e3c76a"],
  vinho: ["#2A1216", "#150809", "#6E2530", "#c9a227"],
  esmeralda: ["#0F1F18", "#07110E", "#1E4638", "#c9a227"],
  azul: ["#111A29", "#070C14", "#28374F", "#c9a227"],
  marfim: ["#faf7f1", "#efe7d7", "#cbbb98", "#8a6b14"],
  areia: ["#f4ecdc", "#e6d7bb", "#bfa875", "#8a6b14"],
  terracota: ["#2A1710", "#160B07", "#6B3524", "#c9a227"],
};

const pecas = [
  // Homem
  ["homem-fato-marfim", "fato", "marfim", "Fato Clássico Marfim"],
  ["homem-smoking-preto", "fato", "noite", "Smoking Preto Gala"],
  ["homem-camisa-linho", "camisa", "marfim", "Camisa de Linho"],
  ["homem-trench-areia", "casaco", "areia", "Trench Coat Areia"],
  ["homem-chino-caqui", "calcas", "areia", "Calças Chino"],
  ["homem-fato-indigo", "fato", "azul", "Fato Índigo"],
  // Mulher
  ["mulher-vestido-bordeaux", "vestido", "vinho", "Vestido de Gala"],
  ["mulher-vestido-dourado", "vestido", "ouro", "Vestido Cerimónia"],
  ["mulher-blazer-preto", "casaco", "noite", "Blazer de Alfaiataria"],
  ["mulher-blusa-seda", "camisa", "marfim", "Blusa de Seda"],
  ["mulher-conjunto-wax", "conjunto", "terracota", "Conjunto Wax"],
  ["mulher-casaco-camel", "casaco", "areia", "Casaco de Lã Camel"],
  // Criança
  ["crianca-fato-azul", "fato", "azul", "Fatinho de Cerimónia"],
  ["crianca-vestido-dama", "vestido", "marfim", "Vestido Dama de Honor"],
  ["crianca-casaco-chuva", "casaco", "esmeralda", "Casaco Impermeável"],
  ["crianca-conjunto-desporto", "conjunto", "azul", "Conjunto Desportivo"],
];

const PALETAS_CLARAS = new Set(["marfim", "areia"]);

function svg(tipo, paleta, titulo) {
  const [c1, c2, silhueta, acento] = paletas[paleta];
  const claro = PALETAS_CLARAS.has(paleta);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" width="900" height="1200" role="img" aria-label="${titulo}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="luz" cx="0.5" cy="0.32" r="0.62">
      <stop offset="0%" stop-color="${claro ? "#ffffff" : "#e3c76a"}" stop-opacity="${claro ? 0.6 : 0.14}"/>
      <stop offset="100%" stop-color="${claro ? "#ffffff" : "#e3c76a"}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vinheta" cx="0.5" cy="0.45" r="0.78">
      <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="${claro ? 0.05 : 0.45}"/>
    </radialGradient>
  </defs>
  <rect width="900" height="1200" fill="url(#g)"/>
  <rect width="900" height="1200" fill="url(#luz)"/>
  <rect width="900" height="1200" fill="url(#vinheta)"/>
  <g transform="translate(0,60) scale(1,0.98)" fill="${silhueta}" fill-opacity="${claro ? 0.9 : 1}" stroke="${acento}" stroke-opacity="${claro ? 0.35 : 0.5}" stroke-linejoin="round">
    ${silhuetas[tipo]}
  </g>
  <g opacity="0.5">
    <circle cx="450" cy="1085" r="3" fill="${acento}"/>
    <line x1="330" y1="1085" x2="420" y2="1085" stroke="${acento}" stroke-width="1"/>
    <line x1="480" y1="1085" x2="570" y2="1085" stroke="${acento}" stroke-width="1"/>
  </g>
  <text x="450" y="1140" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="${acento}" letter-spacing="2">${titulo}</text>
</svg>
`;
}

for (const [nome, tipo, paleta, titulo] of pecas) {
  writeFileSync(join(destino, `${nome}.svg`), svg(tipo, paleta, titulo), "utf8");
}

console.log(`${pecas.length} imagens criadas em public/img/`);
