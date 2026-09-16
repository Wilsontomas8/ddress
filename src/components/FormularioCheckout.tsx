"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCarrinho } from "./Carrinho";
import { formatKz } from "@/lib/money";
import { DIAS_SEMANA, MESES, parseDay } from "@/lib/dates";

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
};

export default function FormularioCheckout({ loja, cartaoAtivo, utilizador }: Props) {
  const router = useRouter();
  const { itens, carregado, subtotal, caucaoTotal, limpar } = useCarrinho();

  const [nome, setNome] = useState(utilizador?.nome ?? "");
  const [telefone, setTelefone] = useState(utilizador?.telefone ?? "");
  const [email, setEmail] = useState(utilizador?.email ?? "");
  const [morada, setMorada] = useState(utilizador?.morada ?? "");
  const [entrega, setEntrega] = useState<"LEVANTAMENTO" | "DOMICILIO">("LEVANTAMENTO");
  const [metodo, setMetodo] = useState<Metodo>("MULTICAIXA_EXPRESS");
  const [referencia, setReferencia] = useState("");
  const [nota, setNota] = useState("");
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
    if (entrega === "DOMICILIO" && morada.trim().length < 8) {
      setErro("Indique a morada de entrega.");
      return;
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
          referenciaPagamento: pedeReferencia ? referencia.trim() || undefined : undefined,
          nota: nota.trim() || undefined,
          itens: itens.map((i) => ({
            variantId: i.variantId,
            tipo: i.tipo,
            quantidade: i.quantidade,
            inicio: i.inicio,
            fim: i.fim,
            prova: i.prova,
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

        {/* ------------------------------------------------- entrega */}
        <section>
          <h2 className="font-display text-xl">Entrega</h2>
          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 border border-areia-300 bg-white p-4">
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
            <label className="flex cursor-pointer items-start gap-3 border border-areia-300 bg-white p-4">
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

          {entrega === "DOMICILIO" && (
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
                    ? "cursor-pointer border-areia-300 bg-white"
                    : "cursor-not-allowed border-areia-200 bg-areia-100 opacity-60"
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

        <ul className="mt-4 space-y-3 border-b border-areia-200 pb-4 text-sm">
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
          <div className="flex justify-between border-t border-areia-200 pt-3">
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
          <p className="mt-4 border-l-2 border-vinho bg-areia-100 px-3 py-2 text-sm">{erro}</p>
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
