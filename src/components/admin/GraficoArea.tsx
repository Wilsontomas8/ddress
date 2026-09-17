/**
 * Gráfico de área em SVG, desenhado no servidor (sem bibliotecas).
 * Curvas suaves, preenchimento em degradê e grelha discreta, no estilo
 * do painel escuro.
 */

type Serie = { nome: string; cor: string; valores: number[] };

type Props = {
  rotulos: string[];
  series: Serie[];
  formatar: (n: number) => string;
  titulo: string;
};

const L = 640;
const A = 240;
const M = { topo: 16, dir: 12, baixo: 28, esq: 56 };

function curva(pontos: [number, number][]): string {
  if (pontos.length === 0) return "";
  let d = `M ${pontos[0][0]} ${pontos[0][1]}`;
  for (let i = 0; i < pontos.length - 1; i++) {
    const p0 = pontos[i - 1] ?? pontos[i];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${Math.min(c1y, A - M.baixo)} ${c2x} ${Math.min(c2y, A - M.baixo)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function tectoRedondo(n: number): number {
  if (n <= 0) return 1;
  const ordem = 10 ** Math.floor(Math.log10(n));
  return Math.ceil(n / ordem) * ordem;
}

export default function GraficoArea({ rotulos, series, formatar, titulo }: Props) {
  const maximo = tectoRedondo(Math.max(0, ...series.flatMap((s) => s.valores)));
  const larguraUtil = L - M.esq - M.dir;
  const alturaUtil = A - M.topo - M.baixo;
  const x = (i: number) => M.esq + (rotulos.length > 1 ? (i / (rotulos.length - 1)) * larguraUtil : larguraUtil / 2);
  const y = (v: number) => M.topo + alturaUtil - (v / maximo) * alturaUtil;
  const linhas = [0, 0.25, 0.5, 0.75, 1];

  return (
    <figure>
      <svg viewBox={`0 0 ${L} ${A}`} className="h-auto w-full" role="img" aria-label={titulo}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.nome} id={`area-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.cor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={s.cor} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {linhas.map((f) => (
          <g key={f}>
            <line x1={M.esq} x2={L - M.dir} y1={y(maximo * f)} y2={y(maximo * f)} stroke="currentColor" strokeOpacity="0.08" />
            <text x={M.esq - 10} y={y(maximo * f) + 4} textAnchor="end" className="fill-tinta-50 text-[10px]">
              {formatar(maximo * f)}
            </text>
          </g>
        ))}

        {rotulos.map((r, i) => (
          <text key={r + i} x={x(i)} y={A - 8} textAnchor="middle" className="fill-tinta-50 text-[10px]">
            {r}
          </text>
        ))}

        {series.map((s, i) => {
          const pontos = s.valores.map((v, j) => [x(j), y(v)] as [number, number]);
          const linha = curva(pontos);
          const area = `${linha} L ${x(s.valores.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
          const ultimo = pontos[pontos.length - 1];
          return (
            <g key={s.nome}>
              <path d={area} fill={`url(#area-${i})`} />
              <path d={linha} fill="none" stroke={s.cor} strokeWidth="2" strokeLinecap="round" />
              {pontos.map(([px, py], j) => (
                <circle key={j} cx={px} cy={py} r="10" fill="transparent">
                  <title>{`${s.nome} · ${rotulos[j]}: ${formatar(s.valores[j])}`}</title>
                </circle>
              ))}
              {ultimo && <circle cx={ultimo[0]} cy={ultimo[1]} r="4" fill={s.cor} stroke="#0f0f0f" strokeWidth="2" />}
            </g>
          );
        })}
      </svg>

      <figcaption className="sr-only">
        {series.map((s) => `${s.nome}: ${s.valores.map((v, i) => `${rotulos[i]} ${formatar(v)}`).join(", ")}.`).join(" ")}
      </figcaption>
    </figure>
  );
}
