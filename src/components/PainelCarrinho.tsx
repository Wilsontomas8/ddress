"use client";

import Link from "next/link";
import { useCarrinho } from "./Carrinho";
import { formatKz } from "@/lib/money";
import { DIAS_SEMANA, MESES, parseDay } from "@/lib/dates";

export default function PainelCarrinho() {
  const { itens, carregado, remover, alterarQuantidade, subtotal, caucaoTotal } = useCarrinho();

  if (!carregado) {
    return <p className="text-sm text-tinta-50">A carregar…</p>;
  }

  if (itens.length === 0) {
    return (
      <div className="cartao p-10 text-center">
        <p className="font-display text-xl">O carrinho está vazio.</p>
        <p className="mt-2 text-sm text-tinta-70">
          Veja as peças disponíveis para comprar ou alugar.
        </p>
        <Link href="/loja" className="btn btn-principal mt-6">
          Ver a colecção
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <ul className="space-y-6">
        {itens.map((i) => (
          <li key={i.chave} className="flex gap-4 border-b border-areia-200 pb-6">
            <Link href={`/produto/${i.productSlug}`} className="shrink-0">
              {i.imagem ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={i.imagem}
                  alt={i.nome}
                  className="h-28 w-21 bg-areia-100 object-cover"
                  style={{ width: "5.25rem" }}
                />
              ) : (
                <div className="h-28 w-[5.25rem] bg-areia-200" />
              )}
            </Link>

            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/produto/${i.productSlug}`}
                    className="font-display text-lg hover:text-vinho"
                  >
                    {i.nome}
                  </Link>
                  <p className="text-sm text-tinta-70">{i.variante}</p>
                </div>
                <span className="selo bg-areia-100 text-tinta-70">
                  {i.tipo === "VENDA" ? "Compra" : "Aluguer"}
                </span>
              </div>

              {i.tipo === "ALUGUER" && i.inicio && i.fim && (
                <p className="mt-2 text-sm text-tinta-70">
                  {formatarData(i.inicio)} → {formatarData(i.fim)}
                  {i.dias ? ` · ${i.dias} dia(s)` : ""}
                </p>
              )}

              {i.prova && (
                <p className="mt-1 text-sm text-verde">
                  Prova no ateliê: {formatarData(i.prova.data)} às {i.prova.hora}
                </p>
              )}
              {i.exigeProva && !i.prova && (
                <p className="mt-1 text-sm text-vinho">
                  Esta peça exige prova — volte à página da peça para escolher a hora.
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {i.tipo === "VENDA" ? (
                    <div className="flex items-center border border-areia-300">
                      <button
                        type="button"
                        className="px-3 py-1 text-tinta-70 hover:bg-areia-100"
                        onClick={() => alterarQuantidade(i.chave, i.quantidade - 1)}
                        aria-label="Menos uma unidade"
                      >
                        −
                      </button>
                      <span className="min-w-8 text-center text-sm">{i.quantidade}</span>
                      <button
                        type="button"
                        className="px-3 py-1 text-tinta-70 hover:bg-areia-100"
                        onClick={() => alterarQuantidade(i.chave, i.quantidade + 1)}
                        aria-label="Mais uma unidade"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-tinta-50">Peça única</span>
                  )}
                  <button
                    type="button"
                    className="text-sm text-tinta-50 underline underline-offset-4 hover:text-vinho"
                    onClick={() => remover(i.chave)}
                  >
                    Remover
                  </button>
                </div>

                <div className="text-right">
                  <p className="font-medium">{formatKz(i.preco * i.quantidade)}</p>
                  {i.caucao > 0 && (
                    <p className="text-xs text-tinta-50">
                      + {formatKz(i.caucao * i.quantidade)} de caução
                    </p>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit cartao p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-lg">Resumo</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-tinta-70">Peças</dt>
            <dd>{formatKz(subtotal)}</dd>
          </div>
          {caucaoTotal > 0 && (
            <div className="flex justify-between">
              <dt className="text-tinta-70">Caução (devolvida)</dt>
              <dd>{formatKz(caucaoTotal)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-areia-200 pt-3">
            <dt className="font-medium">A pagar</dt>
            <dd className="font-display text-xl">{formatKz(subtotal + caucaoTotal)}</dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-tinta-50">
          A entrega ao domicílio, se a escolher, é somada no passo seguinte.
        </p>

        <Link href="/checkout" className="btn btn-principal mt-6 w-full">
          Continuar
        </Link>
        <Link href="/loja" className="btn btn-contorno mt-2 w-full">
          Continuar a ver peças
        </Link>
      </aside>
    </div>
  );
}

function formatarData(iso: string) {
  const d = parseDay(iso);
  return `${DIAS_SEMANA[d.getUTCDay()].slice(0, 3)}, ${d.getUTCDate()} ${MESES[d.getUTCMonth()].slice(0, 3)}`;
}
