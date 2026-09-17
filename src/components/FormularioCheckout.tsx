"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCarrinho } from "./Carrinho";
import { formatKz } from "@/lib/money";
import { DIAS_SEMANA, MESES, parseDay } from "@/lib/dates";
import EscolherSapatos from "./EscolherSapatos";

type Metodo = "MULTICAIXA_EXPRESS" | "TRANSFERENCIA" | "NA_ENTREGA" | "CARTAO";

type Props = {
  loja: {
    bankName: string;
    accountHolder: string;
    iban: string;
    multicaixaNumber: string;
    deliveryFee: number;
    address: string;
    phone: string;
  };
  cartaoAtivo: boolean;
  utilizador: { nome: string; email: string; telefone: string; morada: string } | null;
  /** Maquilhadoras parceiras que a cliente pode pedir com a encomenda */
  parceiros: { id: string; name: string }[];
};

export default function FormularioCheckout({ loja, cartaoAtivo, utilizador, parceiros }: Props) {
  const router = useRouter();
  const { itens, carregado, subtotal, caucaoTotal, limpar } = useCarrinho();

  const [nome, setNome] = useState(utilizador?.nome ?? "");
  const [telefone, setTelefone] = useState(utilizador?.telefone ?? "");
  const [email, setEmail] = useState(utilizador?.email ?? "");
  const [morada, setMorada] = useState(utilizador?.morada ?? "");
  const [entrega, setEntrega] = useState<"LEVANTAMENTO" | "DOMICILIO">("LEVANTAMENTO");
  const [residencia, setResidencia] = useState<"LUANDA" | "FORA_LUANDA">("LUANDA");
  const [declaracao, setDeclaracao] = useState(false);
  const [metodo, setMetodo] = useState<Metodo>("MULTICAIXA_EXPRESS");
  const [referencia, setReferencia] = useState("");
  const [nota, setNota] = useState("");
  // Complete o look
  const [querMaquilhagem, setQuerMaquilhagem] = useState(false);
  const [parceiroId, setParceiroId] = useState(parceiros[0]?.id ?? "");
  const [dataMaquilhagem, setDataMaquilhagem] = useState("");
  const [horaMaquilhagem, setHoraMaquilhagem] = useState("");
  const [localMaquilhagem, setLocalMaquilhagem] = useState("");
  const [notaMaquilhagem, setNotaMaquilhagem] = useState("");
  const [querSapatos, setQuerSapatos] = useState(false);
  const [tamanhoSapatos, setTamanhoSapatos] = useState("");
  const [notaSapatos, setNotaSapatos] = useState("");
  const [sapatos, setSapatos] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  const METODOS: { valor: Metodo; titulo: string; texto: string; ativo: boolean }[] = [
    {
      valor: "MULTICAIXA_EXPRESS",
      titulo: "Multicaixa Express",
      texto: `Pague para ${loja.multicaixaNumber} e escreva abaixo a referência da operação.`,
      ativo: true,
    },
    {
      valor: "TRANSFERENCIA",
      titulo: "Transferência bancária",
      texto: `${loja.bankName} · ${loja.accountHolder} · IBAN ${loja.iban}. Envie o comprovativo por WhatsApp para ${loja.phone} ou indique aqui o número da operação.`,
      ativo: true,
    },
    {
      valor: "NA_ENTREGA",
      titulo: "Pagamento na entrega ou no ateliê",
      texto: "Paga quando levantar a peça ou quando lhe for entregue.",
      ativo: true,
    },
    {
      valor: "CARTAO",
      titulo: "Cartão Visa / Mastercard",
      texto: cartaoAtivo
        ? "Pagamento online imediato. É encaminhado para a página segura no passo seguinte."
        : "Ainda não ativado nesta loja.",
      ativo: cartaoAtivo,
    },
  ];

  const taxaEntrega = entrega === "DOMICILIO" ? loja.deliveryFee : 0;
  const total = subtotal + caucaoTotal + taxaEntrega;
  const pedeReferencia = metodo === "MULTICAIXA_EXPRESS" || metodo === "TRANSFERENCIA";
  const provasEmFalta = itens.filter((i) => i.exigeProva && !i.prova);
  const comDispensa = itens.filter((i) => i.dispensaProva);
  const precisaDeclaracao = comDispensa.length > 0;

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (itens.length === 0) {
      setErro("O carrinho está vazio.");
      return;
    }
    if (provasEmFalta.length > 0) {
      setErro(
        `Falta marcar a prova de: ${provasEmFalta.map((i) => i.nome).join(", ")}. Abra a página da peça e escolha um horário.`
      );
      return;
    }
    if (querMaquilhagem && !dataMaquilhagem) {
      setErro("Indique o dia da maquilhagem.");
      return;
    }
    if (entrega === "DOMICILIO" && morada.trim().length < 8) {
      setErro("Indique a morada de entrega.");
      return;
    }
    if (precisaDeclaracao) {
      if (residencia !== "FORA_LUANDA") {
        setErro(
          "Escolheu dispensar a prova por residir fora de Luanda. Confirme essa residência abaixo, ou volte à peça e marque a prova."
        );
        return;
      }
      if (morada.trim().length < 8) {
        setErro("Para dispensar a prova, indique a morada completa fora de Luanda.");
        return;
      }
      if (!declaracao) {
        setErro("Aceite a declaração de responsabilidade para dispensar a prova.");
        return;
      }
    }

    setAEnviar(true);
    try {
      const resposta = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: {
            nome: nome.trim(),
            telefone: telefone.trim(),
            email: email.trim(),
            morada: morada.trim(),
          },
          metodoPagamento: metodo,
          entrega,
          residencia,
          declaracaoAceite: declaracao,
          referenciaPagamento: pedeReferencia ? referencia.trim() || undefined : undefined,
          nota: nota.trim() || undefined,
          extras: {
            maquilhagem: querMaquilhagem
              ? { parceiroId, data: dataMaquilhagem, hora: horaMaquilhagem, local: localMaquilhagem.trim(), notas: notaMaquilhagem.trim() }
              : undefined,
            sapatos: querSapatos ? { tamanho: tamanhoSapatos.trim(), notas: notaSapatos.trim(), produtos: sapatos } : undefined,
          },
          itens: itens.map((i) => ({
            variantId: i.variantId,
            tipo: i.tipo,
            quantidade: i.quantidade,
            inicio: i.inicio,
            fim: i.fim,
            prova: i.prova,
            dispensaProva: i.dispensaProva,
          })),
        }),
      });

      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível registar o pedido.");
        return;
      }

      limpar();
      router.push(`/pedido/${dados.numero}`);
    } catch {
      setErro("Não foi possível falar com o servidor. Verifique a ligação e tente de novo.");
    } finally {
      setAEnviar(false);
    }
  }

  if (!carregado) return <p className="text-sm text-tinta-50">A carregar…</p>;

  if (itens.length === 0) {
    return (
      <div className="cartao p-10 text-center">
        <p className="font-display text-xl">Não há nada para finalizar.</p>
        <Link href="/loja" className="btn btn-principal mt-6">
          Ver a colecção
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submeter} className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-10">
        {/* --------------------------------------------------- dados */}
        <section>
          <h2 className="font-display text-xl">Os seus dados</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="etiqueta">Nome completo</span>
              <input
                className="campo"
                required
                minLength={3}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label>
              <span className="etiqueta">Telefone</span>
              <input
                className="campo"
                required
                minLength={9}
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="+244 9__ ___ ___"
                autoComplete="tel"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="etiqueta">E-mail (opcional)</span>
              <input
                type="email"
                className="campo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
          </div>
        </section>

        {/* ----------------------------------------------- residência */}
        <section>
          <h2 className="font-display text-xl">Onde reside</h2>
          <p className="mt-1 mb-4 text-sm text-tinta-70">
            Em Luanda, a prova no ateliê é obrigatória antes do aluguer. Fora de Luanda, pode
            ser dispensada mediante declaração.
          </p>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 border border-marfim-300 bg-superficie p-4">
              <input
                type="radio"
                name="residencia"
                className="mt-1"
                checked={residencia === "LUANDA"}
                onChange={() => {
                  setResidencia("LUANDA");
                  setDeclaracao(false);
                }}
              />
              <span>
                <span className="block text-sm font-medium">Resido em Luanda</span>
                <span className="block text-sm text-tinta-70">
                  As peças que exigem prova são experimentadas no ateliê.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 border border-marfim-300 bg-superficie p-4">
              <input
                type="radio"
                name="residencia"
                className="mt-1"
                checked={residencia === "FORA_LUANDA"}
                onChange={() => setResidencia("FORA_LUANDA")}
              />
              <span>
                <span className="block text-sm font-medium">Resido fora de Luanda</span>
                <span className="block text-sm text-tinta-70">
                  A prova pode ser dispensada, com declaração de responsabilidade.
                </span>
              </span>
            </label>
          </div>

          {precisaDeclaracao && (
            <div className="mt-4 border-l-2 border-ouro bg-marfim-100 p-4">
              <p className="text-sm font-medium">
                Dispensa de prova para {comDispensa.length} peça(s)
              </p>
              <p className="mt-1 text-sm text-tinta-70">
                {comDispensa.map((i) => i.nome).join(", ")}
              </p>
              <label className="mt-3 flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={declaracao}
                  onChange={(e) => setDeclaracao(e.target.checked)}
                />
                <span className="text-tinta-70">
                  Declaro que resido fora de Luanda, que as medidas que indiquei estão
                  correctas e que assumo a responsabilidade por receber a peça sem prova
                  prévia no ateliê.
                </span>
              </label>
            </div>
          )}
        </section>

        {/* ------------------------------------------------- entrega */}
        <section>
          <h2 className="font-display text-xl">Entrega</h2>
          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 border border-marfim-300 bg-superficie p-4">
              <input
                type="radio"
                name="entrega"
                className="mt-1"
                checked={entrega === "LEVANTAMENTO"}
                onChange={() => setEntrega("LEVANTAMENTO")}
              />
              <span>
                <span className="block text-sm font-medium">Levantar no ateliê</span>
                <span className="block text-sm text-tinta-70">{loja.address} · sem custo</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 border border-marfim-300 bg-superficie p-4">
              <input
                type="radio"
                name="entrega"
                className="mt-1"
                checked={entrega === "DOMICILIO"}
                onChange={() => setEntrega("DOMICILIO")}
              />
              <span>
                <span className="block text-sm font-medium">Entrega ao domicílio</span>
                <span className="block text-sm text-tinta-70">
                  Em Luanda · {formatKz(loja.deliveryFee)}
                </span>
              </span>
            </label>
          </div>

          {(entrega === "DOMICILIO" || precisaDeclaracao) && (
            <label className="mt-4 block">
              <span className="etiqueta">Morada completa</span>
              <textarea
                className="campo"
                rows={3}
                required
                value={morada}
                onChange={(e) => setMorada(e.target.value)}
                placeholder="Rua, número, bairro, ponto de referência"
              />
            </label>
          )}
        </section>

        {/* ----------------------------------------------- pagamento */}
        <section>
          <h2 className="font-display text-xl">Pagamento</h2>
          <div className="mt-4 space-y-3">
            {METODOS.map((m) => (
              <label
                key={m.valor}
                className={`flex items-start gap-3 border p-4 ${
                  m.ativo
                    ? "cursor-pointer border-marfim-300 bg-superficie"
                    : "cursor-not-allowed border-marfim-200 bg-marfim-100 opacity-60"
                }`}
              >
                <input
                  type="radio"
                  name="metodo"
                  className="mt-1"
                  disabled={!m.ativo}
                  checked={metodo === m.valor}
                  onChange={() => setMetodo(m.valor)}
                />
                <span>
                  <span className="block text-sm font-medium">{m.titulo}</span>
                  <span className="block text-sm text-tinta-70">{m.texto}</span>
                </span>
              </label>
            ))}
          </div>

          {pedeReferencia && (
            <label className="mt-4 block">
              <span className="etiqueta">Referência da operação (se já pagou)</span>
              <input
                className="campo"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ex.: MCX 883100 ou TRF 998211"
              />
              <span className="mt-1 block text-xs text-tinta-50">
                Pode deixar em branco e pagar depois — o funcionário confirma consigo.
              </span>
            </label>
          )}
        </section>

        {/* --------------------------------------------- complete o look */}
        <section>
          <h2 className="font-display text-xl">Complete o look</h2>
          <p className="mt-1 text-sm text-tinta-70">Opcional. A loja recebe o pedido junto com a encomenda e confirma consigo.</p>

          {parceiros.length > 0 && (
            <div className="mt-4 border border-marfim-300 bg-superficie p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1" checked={querMaquilhagem} onChange={(e) => setQuerMaquilhagem(e.target.checked)} />
                <span>
                  <span className="block font-medium">Quero maquilhagem com a nossa parceira</span>
                  <span className="block text-sm text-tinta-70">{parceiros.map((p) => p.name).join(" · ")}</span>
                </span>
              </label>
              {querMaquilhagem && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {parceiros.length > 1 && (
                    <label className="block sm:col-span-2">
                      <span className="etiqueta">Maquilhadora</span>
                      <select className="campo" value={parceiroId} onChange={(e) => setParceiroId(e.target.value)}>
                        {parceiros.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="block">
                    <span className="etiqueta">Dia</span>
                    <input type="date" className="campo" value={dataMaquilhagem} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDataMaquilhagem(e.target.value)} />
                  </label>
                  <label className="block">
                    <span className="etiqueta">Hora (opcional)</span>
                    <input type="time" className="campo" value={horaMaquilhagem} onChange={(e) => setHoraMaquilhagem(e.target.value)} />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="etiqueta">Local (opcional)</span>
                    <input className="campo" value={localMaquilhagem} onChange={(e) => setLocalMaquilhagem(e.target.value)} placeholder="Talatona, Luanda" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="etiqueta">O que imagina (opcional)</span>
                    <textarea className="campo" rows={2} value={notaMaquilhagem} onChange={(e) => setNotaMaquilhagem(e.target.value)} placeholder="Maquilhagem suave, cabelo apanhado…" />
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 border border-marfim-300 bg-superficie p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1" checked={querSapatos} onChange={(e) => setQuerSapatos(e.target.checked)} />
              <span>
                <span className="block font-medium">Quero sapatos para combinar</span>
                <span className="block text-sm text-tinta-70">Escolha modelos ou deixe a loja sugerir.</span>
              </span>
            </label>
            {querSapatos && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                  <label className="block">
                    <span className="etiqueta">Tamanho</span>
                    <input className="campo" inputMode="numeric" value={tamanhoSapatos} onChange={(e) => setTamanhoSapatos(e.target.value)} placeholder="38" />
                  </label>
                  <label className="block">
                    <span className="etiqueta">Preferências (opcional)</span>
                    <input className="campo" value={notaSapatos} onChange={(e) => setNotaSapatos(e.target.value)} placeholder="Salto baixo, dourado…" />
                  </label>
                </div>
                <EscolherSapatos escolhidos={sapatos} onChange={setSapatos} />
              </div>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------- nota */}
        <section>
          <h2 className="font-display text-xl">Alguma indicação para nós?</h2>
          <textarea
            className="campo mt-4"
            rows={3}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ex.: é para um casamento no sábado; prefiro ser contactada de manhã."
          />
        </section>
      </div>

      {/* ---------------------------------------------------- resumo */}
      <aside className="h-fit cartao p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-lg">O seu pedido</h2>

        <ul className="mt-4 space-y-3 border-b border-marfim-200 pb-4 text-sm">
          {itens.map((i) => (
            <li key={i.chave}>
              <div className="flex justify-between gap-3">
                <span>
                  {i.nome}
                  {i.quantidade > 1 ? ` × ${i.quantidade}` : ""}
                  <span className="block text-xs text-tinta-50">
                    {i.tipo === "ALUGUER" && i.inicio && i.fim
                      ? `Aluguer ${formatarData(i.inicio)} → ${formatarData(i.fim)}`
                      : i.variante}
                  </span>
                  {i.prova && (
                    <span className="block text-xs text-verde">
                      Prova {formatarData(i.prova.data)} · {i.prova.hora}
                    </span>
                  )}
                </span>
                <span className="shrink-0">{formatKz(i.preco * i.quantidade)}</span>
              </div>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-tinta-70">Peças</dt>
            <dd>{formatKz(subtotal)}</dd>
          </div>
          {caucaoTotal > 0 && (
            <div className="flex justify-between">
              <dt className="text-tinta-70">Caução</dt>
              <dd>{formatKz(caucaoTotal)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-tinta-70">Entrega</dt>
            <dd>{taxaEntrega ? formatKz(taxaEntrega) : "—"}</dd>
          </div>
          <div className="flex justify-between border-t border-marfim-200 pt-3">
            <dt className="font-medium">Total</dt>
            <dd className="font-display text-xl">{formatKz(total)}</dd>
          </div>
        </dl>

        {caucaoTotal > 0 && (
          <p className="mt-3 text-xs text-tinta-50">
            A caução de {formatKz(caucaoTotal)} é devolvida depois de a peça voltar ao ateliê em
            bom estado.
          </p>
        )}

        {erro && (
          <p className="mt-4 border-l-2 border-ouro bg-marfim-100 px-3 py-2 text-sm">{erro}</p>
        )}

        <button type="submit" className="btn btn-principal mt-6 w-full" disabled={aEnviar}>
          {aEnviar ? "A enviar…" : "Enviar pedido"}
        </button>
        <p className="mt-3 text-xs text-tinta-50">
          Ao enviar, o pedido fica registado na loja. Só é cobrado depois de confirmarmos
          consigo.
        </p>
      </aside>
    </form>
  );
}

function formatarData(iso: string) {
  const d = parseDay(iso);
  return `${DIAS_SEMANA[d.getUTCDay()].slice(0, 3)}, ${d.getUTCDate()} ${MESES[d.getUTCMonth()].slice(0, 3)}`;
}
