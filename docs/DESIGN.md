# DDRESS — sistema visual

Fonte de verdade da cor e dos componentes: `src/app/globals.css`. Este documento explica as
decisões; se os dois discordarem, vale o CSS e este ficheiro é corrigido.

## Linguagem

A identidade parte do logótipo: **ouro em relevo sobre tecido preto**. A loja usa **marfim**
nas zonas de leitura e reserva o preto para as zonas de marca (cabeçalho, vídeo, faixas
editoriais, rodapé). O painel de gestão inverte: escuro em todo o lado, ouro como único acento.

Referências de linguagem (usadas como calibração, sem copiar marcas):

| Referência | O que se aproveitou |
|---|---|
| Hyer | Vídeo de página inteira, cabeçalho transparente, títulos de grande escala terminados em ponto, botões em pílula, rodapé com a marca em escala de página |
| Aligne (moda.md) | Ficha de peça sem moldura — a fotografia é a interface; rótulos curtos em caixa-alta espaçada |
| Peak Design | Faixas alternadas claro/escuro, secção dividida texto/imagem, serifa editorial em itálico, filtros em pílula |
| Augen Pro | Muito espaço entre secções, hairlines finas, contenção na cor |
| Modelo Dribbble (painel) | Barra lateral com ícones, indicadores com variação, gráfico de área, acções rápidas, listas com barras de progresso |

## Cor

| Token | Loja | Painel (`.tema-escuro`) | Uso |
|---|---|---|---|
| `marfim-50` | `#fbf8f2` | `#070707` | Fundo da página |
| `marfim-100` | `#f3ede1` | `#141414` | Faixas, hover de linhas |
| `marfim-200` | `#e7dfcf` | `#222222` | Hairlines, bordas de cartão |
| `marfim-300` | `#d6caaf` | `#2e2e2e` | Bordas de campos e chips |
| `superficie` | `#ffffff` | `#0f0f0f` | Cartões e campos |
| `tinta` | `#14120f` | `#f5f3ef` | Texto principal |
| `tinta-70` | `#4a4439` | `#b9b4ab` | Texto secundário |
| `tinta-50` | `#6e6757` | `#8a857b` | Legendas |
| `ouro-claro` / `ouro` | `#e6c56a` / `#c9a33a` | igual | Acção principal, destaques sobre escuro |
| `ouro-escuro` | `#85660f` | `#e6c56a` | Ligações e rótulos sobre claro |
| `preto` | `#0a0a0a` | igual | Tecido: cabeçalho, vídeo, rodapé |
| `verde` / `azul` / `violeta` / `rubi` | tons escuros | tons claros | Estados (selos `tom-*`) |

Regras:

- **Um único acento**: o ouro. O bloco preenchido a ouro (pacote de fim-de-semana) aparece
  uma vez por página.
- Estados usam as classes `selo tom-verde|tom-azul|tom-violeta|tom-ouro|tom-rubi|tom-neutro`,
  que se adaptam sozinhas ao tema. Nunca cores da paleta padrão do Tailwind.
- Nada de `#000`/`#fff` soltos no markup: usar tokens.

### Contraste medido (WCAG 2.x, AA = 4,5:1)

| Par | Razão |
|---|---|
| tinta / marfim-50 | 17,64 |
| tinta-70 / marfim-50 | 9,10 |
| tinta-50 / marfim-50 | 5,30 |
| ouro-escuro / marfim-50 | 5,07 |
| preto / ouro-claro (botão principal) | 11,84 |
| marfim / preto | 18,68 |
| painel: tinta / superfície | 17,30 |
| painel: tinta-50 / superfície | 5,22 |
| painel: ouro-claro / superfície | 11,46 |
| painel: verde / rubi sobre superfície | 8,49 / 7,09 |

## Tipografia

| Papel | Fonte | Notas |
|---|---|---|
| Interface, corpo, botões, rótulos | **SF Pro** (`-apple-system`) → Inter | A fonte da Apple em iPhone, iPad e Mac; Inter (auto-alojada) nos restantes |
| Títulos, números grandes | **Bodoni Moda** | Didone de moda, auto-alojado; itálico para a segunda parte dos títulos |

- Títulos: Bodoni Moda 500, tracking ligeiramente negativo (−0,015em; −0,03em no vídeo).
- Rótulos: classe `.rotulo` — 11px, 600, caixa-alta, +0,16em.
- Números em tabelas e preços: classe `.num` (algarismos tabulares).
- Nenhum pedido do visitante vai a servidores de fontes externos.

## Forma e profundidade

- **Loja**: imagens e cartões com cantos vivos (`--raio-cartao: 0`), campos quase vivos (2px);
  botões, chips e selos em **pílula**. Sem sombras — separação por tom e hairlines.
- **Painel**: cartões de 16px e campos de 10px, com um degradê muito subtil no topo.
- Hover discreto: cor, borda ou sublinhado; na loja, zoom lento só nas fotografias.

## Movimento

- Vídeo e slides respeitam `prefers-reduced-motion` e a poupança de dados (imagem parada).
- Slides passam a cada 8 s, com pausa, anterior/seguinte e indicadores acessíveis.
- Transições de 150–200ms; animações de entrada só no texto do vídeo.

## Componentes base (classes)

| Classe | Uso |
|---|---|
| `btn btn-principal` | Acção principal (ouro) |
| `btn btn-escuro` | Acção forte sobre claro |
| `btn btn-contorno` / `btn-contorno-claro` | Secundária sobre claro / sobre escuro ou vídeo |
| `btn btn-perigo` | Acções destrutivas |
| `campo`, `etiqueta` | Formulários |
| `cartao` | Superfície elevada |
| `chip` (+ `aria-current="true"`) | Filtros |
| `selo tom-*` | Estados |
| `tabela` | Tabelas do painel |
| `filete-ouro`, `texto-ouro`, `regua` | Detalhes da marca |

## Verificação

`npm run capturas` gera capturas a 390, 768 e 1360 px e falha se alguma página transbordar na
horizontal. Última verificação: todas as páginas da loja e do painel sem transbordo.
