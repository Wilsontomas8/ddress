"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CalendarioProva, { type HorarioEscolhido } from "./CalendarioProva";
import { useCarrinho } from "./Carrinho";
import { formatKz } from "@/lib/money";
import { DIAS_SEMANA, MESES, parseDay, toISODay } from "@/lib/dates";

export type VarianteCliente = {
  id: string;
  size: string;
  color: string;
  saleStock: number;
  rentalStock: number;
  aluguer: {
    disponivel: boolean;
    disponivelDe: string;
    ocupadaAte: string | null;
    exemplares: number;
  };
};

type Props = {
  produto: {
    id: string;
    slug: string;
    nome: string;
    oferta: "VENDA" | "ALUGUER" | "AMBOS";
    salePrice: number | null;
    rentalDayPrice: number | null;
    rentalWeekendPrice: number | null;
    rentalDeposit: number | null;
    minRentalDays: number;
    maxRentalDays: number;
    requiresFitting: boolean;
  };
  imagem: string | null;
  variantes: VarianteCliente[];
};

type Orcamento = {
  dias: number;
  preco: number;
  caucao: number;
  detalhe: string;
  pacoteFimDeSemana: boolean;
};

export default function SelectorProduto({ produto, imagem, variantes }: Props) {
  const router = useRouter();
  const { adicionar } = useCarrinho();

  const podeVender = produto.oferta === "VENDA" || produto.oferta === "AMBOS";
  const podeAlugar = produto.oferta === "ALUGUER" || produto.oferta === "AMBOS";

  const [modo, setModo] = useState<"VENDA" | "ALUGUER">(podeVender ? "VENDA" : "ALUGUER");
  const [variantId, setVariantId] = useState<string | null>(null);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [erroDatas, setErroDatas] = useState<string | null>(null);
  const [aOrcamentar, setAOrcamentar] = useState(false);
  const [prova, setProva] = useState<HorarioEscolhido | null>(null);
  const [querProva, setQuerProva] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const variante = useMemo(
    () => variantes.find((v) => v.id === variantId) ?? null,
    [variantId, variantes]
  );

  const disponiveis = useMemo(
    () =>
      variantes.filter((v) => (modo === "VENDA" ? v.saleStock > 0 : v.rentalStock > 0)),
    [variantes, modo]
  );

  // Trocar de modo limpa o que já não faz sentido
  useEffect(() => {
    setVariantId(null);
    setInicio("");
    setFim("");
    setOrcamento(null);
    setProva(null);
    setQuerProva(false);
    setMensagem(null);
  }, [modo]);

  const provaObrigatoria = modo === "ALUGUER" && produto.requiresFitting;
  const mostrarCalendario = provaObrigatoria || querProva;

  // Primeiro dia que esta peça pode ser levantada
  const primeiroDia = variante?.aluguer.disponivelDe ?? toISODay(new Date());

  // Pedir orçamento ao servidor sempre que as datas mudam
  useEffect(() => {
    if (modo !== "ALUGUER" || !variantId || !inicio || !fim) {
      setOrcamento(null);
      setErroDatas(null);
      return;
    }
    let cancelado = false;
    setAOrcamentar(true);
    setErroDatas(null);

    fetch(`/api/pecas/${variantId}/orcamento?inicio=${inicio}&fim=${fim}`)
      .then(async (r) => ({ ok: r.ok, json: await r.json() }))
      .then(({ ok, json }) => {
        if (cancelado) return;
        if (!ok) {
          setOrcamento(null);
          setErroDatas(json.erro ?? "Não foi possível calcular o aluguer.");
        } else {
          setOrcamento(json);
        }
      })
      .catch(() => {
        if (!cancelado) setErroDatas("Não foi possível falar com o servidor.");
      })
      .finally(() => {
        if (!cancelado) setAOrcamentar(false);
      });

    return () => {
      cancelado = true;
    };
  }, [modo, variantId, inicio, fim]);

  function adicionarAoCarrinho(irParaCarrinho: boolean) {
    if (!variante) {
      setMensagem("Escolha o tamanho.");
      return;
    }
    if (modo === "ALUGUER") {
      if (!orcamento) {
        setMensagem("Escolha as datas do aluguer.");
        return;
      }
      if (provaObrigatoria && !prova) {
        setMensagem("Esta peça exige prova no ateliê. Escolha o dia e a hora.");
        return;
      }
    }

    const chave =
      modo === "ALUGUER"
        ? `${variante.id}-ALUGUER-${inicio}-${fim}`
        : `${variante.id}-VENDA`;

    adicionar({
      chave,
      productId: produto.id,
      productSlug: produto.slug,
      variantId: variante.id,
      nome: produto.nome,
      variante: `Tamanho ${variante.size} · ${variante.color}`,
      imagem,
      tipo: modo,
      quantidade: 1,
      preco: modo === "VENDA" ? (produto.salePrice ?? 0) : (orcamento?.preco ?? 0),
      caucao: modo === "VENDA" ? 0 : (orcamento?.caucao ?? 0),
      inicio: modo === "ALUGUER" ? inicio : undefined,
      fim: modo === "ALUGUER" ? fim : undefined,
      dias: modo === "ALUGUER" ? orcamento?.dias : undefined,
      exigeProva: provaObrigatoria,
      prova: prova ?? undefined,
    });

    if (irParaCarrinho) router.push("/carrinho");
    else setMensagem("Peça adicionada ao carrinho.");
  }

  return (
    <div>
      {/* ------------------------------------------------ venda/aluguer */}
      {podeVender && podeAlugar && (
        <div className="mb-6 inline-flex border border-areia-300">
          {(["VENDA", "ALUGUER"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              className={`px-5 py-2 text-sm transition-colors ${
                modo === m ? "bg-tinta text-areia-50" : "bg-white text-tinta-70 hover:bg-areia-100"
              }`}
            >
              {m === "VENDA" ? "Comprar" : "Alugar"}
            </button>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------- preço */}
      <div className="mb-6">
        {modo === "VENDA" ? (
          <p className="font-display text-2xl">{formatKz(produto.salePrice)}</p>
        ) : (
          <div>
            <p className="font-display text-2xl">
              {formatKz(produto.rentalDayPrice)}
              <span className="text-base text-tinta-50"> /dia</span>
            </p>
            {produto.rentalWeekendPrice && (
              <p className="mt-1 text-sm text-tinta-70">
                Pacote fim-de-semana (sexta a domingo/segunda):{" "}
                {formatKz(produto.rentalWeekendPrice)}
              </p>
            )}
            {produto.rentalDeposit ? (
              <p className="mt-1 text-sm text-tinta-70">
                Caução reembolsável de {formatKz(produto.rentalDeposit)}, devolvida depois da
                entrega da peça em bom estado.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------- tamanhos */}
      <div className="mb-6">
        <p className="etiqueta">
          Tamanho {modo === "ALUGUER" && <span className="normal-case">— cada peça tem o seu calendário</span>}
        </p>
        {disponiveis.length === 0 ? (
          <p className="text-sm text-tinta-70">
            {modo === "VENDA"
              ? "Sem stock de venda de momento."
              : "Sem peças de aluguer neste produto."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {disponiveis.map((v) => {
              const livre = modo === "VENDA" ? v.saleStock > 0 : v.aluguer.disponivel;
              const ativo = v.id === variantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariantId(ativo ? null : v.id)}
                  className={`relative min-w-14 border px-3 py-2 text-sm transition-colors ${
                    ativo
                      ? "border-vinho bg-vinho text-white"
                      : livre
                        ? "border-areia-300 bg-white hover:border-tinta"
                        : "border-areia-200 bg-areia-100 text-tinta-50"
                  }`}
                  title={
                    modo === "ALUGUER" && !livre
                      ? `Reservada até ${formatarDataCurta(v.aluguer.disponivelDe)}`
                      : undefined
                  }
                >
                  {v.size}
                  {modo === "ALUGUER" && !livre && (
                    <span className="absolute -top-1.5 -right-1.5 h-2 w-2 rounded-full bg-vinho" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {variante && (
          <p className="mt-2 text-sm text-tinta-70">
            {variante.color}
            {modo === "VENDA"
              ? ` · ${variante.saleStock} em stock`
              : variante.aluguer.disponivel
                ? " · peça livre para reservar"
                : ` · reservada, volta a ${formatarDataCurta(variante.aluguer.disponivelDe)}`}
          </p>
        )}
      </div>

      {/* -------------------------------------------------- datas (aluguer) */}
      {modo === "ALUGUER" && variante && (
        <div className="mb-6">
          <p className="etiqueta">Período do aluguer</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-tinta-50">Levantamento</span>
              <input
                type="date"
                className="campo"
                value={inicio}
                min={primeiroDia}
                onChange={(e) => {
                  setInicio(e.target.value);
                  if (fim && e.target.value > fim) setFim("");
                }}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-tinta-50">Devolução</span>
              <input
                type="date"
                className="campo"
                value={fim}
                min={inicio || primeiroDia}
                disabled={!inicio}
                onChange={(e) => setFim(e.target.value)}
              />
            </label>
          </div>

          <p className="mt-2 text-xs text-tinta-50">
            Aluguer mínimo de {produto.minRentalDays} dia(s), máximo de {produto.maxRentalDays}.
            {!variante.aluguer.disponivel &&
              ` Esta peça só pode ser levantada a partir de ${formatarDataCurta(variante.aluguer.disponivelDe)}.`}
          </p>

          {aOrcamentar && <p className="mt-3 text-sm text-tinta-50">A calcular…</p>}
          {erroDatas && (
            <p className="mt-3 border-l-2 border-vinho bg-areia-100 px-3 py-2 text-sm text-tinta">
              {erroDatas}
            </p>
          )}
          {orcamento && (
            <div className="mt-3 cartao p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-tinta-70">{orcamento.detalhe}</span>
                <span className="font-medium">{formatKz(orcamento.preco)}</span>
              </div>
              {orcamento.caucao > 0 && (
                <div className="mt-1.5 flex justify-between text-tinta-70">
                  <span>Caução (devolvida)</span>
                  <span>{formatKz(orcamento.caucao)}</span>
                </div>
              )}
              <div className="mt-2.5 flex justify-between border-t border-areia-200 pt-2.5">
                <span className="font-medium">A pagar agora</span>
                <span className="font-display text-lg">
                  {formatKz(orcamento.preco + orcamento.caucao)}
                </span>
              </div>
              {orcamento.pacoteFimDeSemana && (
                <p className="mt-2 text-xs text-verde">
                  Aplicámos o pacote de fim-de-semana, mais barato do que o preço por dia.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------- prova */}
      <div className="mb-6">
        {provaObrigatoria ? (
          <>
            <p className="etiqueta">Prova no ateliê — obrigatória</p>
            <p className="mb-3 text-sm text-tinta-70">
              Esta peça só sai depois de a experimentar. Escolha o dia e a hora; o calendário
              mostra apenas as horas em que esta peça está cá.
            </p>
          </>
        ) : (
          <label className="mb-3 flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={querProva}
              onChange={(e) => {
                setQuerProva(e.target.checked);
                if (!e.target.checked) setProva(null);
              }}
              className="mt-0.5"
            />
            <span className="text-tinta-70">
              Quero experimentar no ateliê antes de levar (opcional)
            </span>
          </label>
        )}

        {mostrarCalendario && (
          <CalendarioProva variantId={variantId} valor={prova} onChange={setProva} />
        )}
      </div>

      {/* ------------------------------------------------------ acções */}
      {mensagem && (
        <p className="mb-3 border-l-2 border-vinho bg-areia-100 px-3 py-2 text-sm">{mensagem}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-principal flex-1 sm:flex-none"
          disabled={
            !variante ||
            (modo === "VENDA" && variante.saleStock < 1) ||
            (modo === "ALUGUER" && !orcamento)
          }
          onClick={() => adicionarAoCarrinho(false)}
        >
          Adicionar ao carrinho
        </button>
        <button
          type="button"
          className="btn btn-escuro flex-1 sm:flex-none"
          disabled={
            !variante ||
            (modo === "VENDA" && variante.saleStock < 1) ||
            (modo === "ALUGUER" && !orcamento)
          }
          onClick={() => adicionarAoCarrinho(true)}
        >
          Finalizar pedido
        </button>
      </div>
    </div>
  );
}

function formatarDataCurta(iso: string) {
  const d = parseDay(iso);
  return `${DIAS_SEMANA[d.getUTCDay()].slice(0, 3)}, ${d.getUTCDate()} ${MESES[d.getUTCMonth()].slice(0, 3)}`;
}
