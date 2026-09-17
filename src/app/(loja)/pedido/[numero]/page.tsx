import Link from "next/link";
import { notFound } from "next/navigation";
import { getPedidoPorNumero } from "@/lib/pedidos";
import { getSettings } from "@/lib/settings";
import { formatKz } from "@/lib/money";
import { formatDateTime, formatNumericDate } from "@/lib/dates";
import { avaliarReserva } from "@/lib/expiracao";
import { ESTADO_PAGAMENTO, ESTADO_PEDIDO, METODO_PAGAMENTO, RESIDENCIA } from "@/lib/labels";
import LinhaDoTempo from "@/components/LinhaDoTempo";
import { passosDoPedido } from "@/lib/acompanhamento";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  return { title: `Pedido ${numero}` };
}

export default async function PaginaPedido({
  params,
}: {
  params: Promise<{ numero: string }>;
}) {
  const { numero } = await params;
  const dados = await getPedidoPorNumero(numero);
  if (!dados) notFound();

  const loja = await getSettings();
  const { pedido, itens, marcacoes } = dados;
  const estado = ESTADO_PEDIDO[pedido.status];
  const pagamento = ESTADO_PAGAMENTO[pedido.paymentStatus];

  const temAluguer = itens.some((i) => i.kind === "ALUGUER");
  const pago = pedido.paymentStatus === "PAGO";

  // Reserva de aluguer ainda sem prova: dizer até quando tem de acontecer.
  const inicios = itens.filter((i) => i.kind === "ALUGUER" && i.startDate).map((i) => i.startDate!.getTime());
  const reserva = inicios.length
    ? avaliarReserva(
        {
          estadoDoPedido: pedido.status,
          exigeProva: pedido.needsFitting,
          provaDispensada: pedido.fittingWaived,
          levantamento: new Date(Math.min(...inicios)),
          provas: marcacoes.map((m) => ({ data: m.date, hora: m.startTime, status: m.status })),
        },
        new Date(),
        loja.reservationExpiryHours
      )
    : null;
  const avisoDeProva = reserva?.sujeita && !reserva.temProvaValida && !reserva.expirada ? reserva : null;

  const passos = passosDoPedido({
    status: pedido.status,
    temAluguer,
    precisaProva: pedido.needsFitting,
    provaDispensada: pedido.fittingWaived,
    temFactura: false,
    pago,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="cartao p-8">
        <p className="text-[0.7rem] tracking-[0.14em] text-ouro-escuro uppercase">Pedido registado</p>
        <h1 className="mt-2 font-display text-3xl">{pedido.number}</h1>
        <p className="mt-3 text-sm text-tinta-70">
          Obrigado, {pedido.customerName.split(" ")[0]}. O seu pedido entrou no painel da loja e
          um funcionário nosso vai contactá-lo pelo {pedido.customerPhone} para confirmar tudo.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className={`selo ${estado.cor}`}>{estado.label}</span>
          <span className={`selo ${pagamento.cor}`}>{pagamento.label}</span>
        </div>

        {avisoDeProva && (
          <div className="mt-6 border-l-2 border-rubi bg-marfim-100 px-4 py-3 text-sm text-tinta-70" role="status">
            <p className="font-medium text-tinta">Marque a prova até {formatDateTime(avisoDeProva.limite)}.</p>
            <p className="mt-1">
              Sem prova até lá, a reserva expira e a peça volta a ficar disponível para outros clientes.{" "}
              <Link href="/marcacao" className="ligacao">
                Marcar prova
              </Link>
            </p>
          </div>
        )}

        {/* --------------------------------------------- acompanhamento */}
        <div className="mt-8 border-t border-marfim-200 pt-6">
          <h2 className="font-display text-lg">Acompanhamento</h2>
          <p className="mt-1 mb-4 text-sm text-tinta-70">
            Onde está o seu pedido neste momento.
          </p>
          <LinhaDoTempo passos={passos} />
        </div>

        {pedido.fittingWaived && (
          <div className="mt-6 border-l-2 border-ouro bg-marfim-100 px-3 py-2 text-sm text-tinta-70">
            Residência declarada: {RESIDENCIA[pedido.customerResidence]}. A prova no ateliê foi
            dispensada mediante declaração de responsabilidade.
          </div>
        )}

        {/* ------------------------------------------------ marcações */}
        {marcacoes.length > 0 && (
          <div className="mt-8 border-t border-marfim-200 pt-6">
            <h2 className="font-display text-lg">Provas marcadas</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {marcacoes.map((m) => (
                <li key={m.id} className="flex flex-wrap justify-between gap-2">
                  <span>
                    {formatNumericDate(m.date)} às {m.startTime}
                    <span className="block text-xs text-tinta-50">{m.notes}</span>
                  </span>
                  <span className="text-tinta-50">{m.code}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-tinta-70">
              Apareça no ateliê ({loja.address}) à hora marcada. Se não puder, ligue para{" "}
              {loja.phone}.
            </p>
          </div>
        )}

        {/* ----------------------------------------------------- itens */}
        <div className="mt-8 border-t border-marfim-200 pt-6">
          <h2 className="font-display text-lg">Peças</h2>
          <ul className="mt-3 space-y-4">
            {itens.map((i) => (
              <li key={i.id} className="flex gap-4">
                {i.imageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={i.imageUrl}
                    alt={i.productName}
                    className="h-24 w-[4.5rem] bg-marfim-100 object-cover"
                  />
                )}
                <div className="flex-1 text-sm">
                  <p className="font-medium">{i.productName}</p>
                  <p className="text-tinta-70">{i.variantLabel}</p>
                  <p className="mt-1 text-xs text-tinta-50">
                    {i.kind === "ALUGUER"
                      ? `Aluguer de ${formatNumericDate(i.startDate)} a ${formatNumericDate(i.endDate)} · ${i.days} dia(s)`
                      : `Compra · ${i.quantity} unidade(s)`}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p>{formatKz(i.lineTotal)}</p>
                  {i.deposit > 0 && (
                    <p className="text-xs text-tinta-50">+ {formatKz(i.deposit)} caução</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* --------------------------------------------------- totais */}
        <dl className="mt-8 space-y-2 border-t border-marfim-200 pt-6 text-sm">
          <div className="flex justify-between">
            <dt className="text-tinta-70">Peças</dt>
            <dd>{formatKz(pedido.subtotal)}</dd>
          </div>
          {pedido.depositTotal > 0 && (
            <div className="flex justify-between">
              <dt className="text-tinta-70">Caução (devolvida no fim)</dt>
              <dd>{formatKz(pedido.depositTotal)}</dd>
            </div>
          )}
          {pedido.deliveryFee > 0 && (
            <div className="flex justify-between">
              <dt className="text-tinta-70">Entrega</dt>
              <dd>{formatKz(pedido.deliveryFee)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-marfim-200 pt-3">
            <dt className="font-medium">Total</dt>
            <dd className="font-display text-xl">{formatKz(pedido.total)}</dd>
          </div>
        </dl>

        {/* ------------------------------------------------ pagamento */}
        <div className="mt-8 border-t border-marfim-200 pt-6">
          <h2 className="font-display text-lg">Como pagar</h2>
          <p className="mt-2 text-sm text-tinta-70">
            {METODO_PAGAMENTO[pedido.paymentMethod].label}
          </p>

          {pedido.paymentMethod === "TRANSFERENCIA" && (
            <div className="mt-3 bg-marfim-100 p-4 text-sm">
              <p>
                <strong>{loja.bankName}</strong>
              </p>
              <p>{loja.accountHolder}</p>
              <p className="mt-1 font-mono text-xs">IBAN {loja.iban}</p>
              <p className="mt-2 text-tinta-70">
                Faça a transferência de {formatKz(pedido.total)} e envie o comprovativo por
                WhatsApp para {loja.whatsapp}, indicando o número {pedido.number}.
              </p>
            </div>
          )}

          {pedido.paymentMethod === "MULTICAIXA_EXPRESS" && (
            <div className="mt-3 bg-marfim-100 p-4 text-sm">
              <p>
                Multicaixa Express para <strong>{loja.multicaixaNumber}</strong>
              </p>
              <p className="mt-2 text-tinta-70">
                Valor: {formatKz(pedido.total)}. Indique o número {pedido.number} na descrição.
              </p>
            </div>
          )}

          {pedido.paymentMethod === "NA_ENTREGA" && (
            <p className="mt-3 text-sm text-tinta-70">
              Paga {formatKz(pedido.total)} quando levantar a peça no ateliê ou na entrega.
            </p>
          )}
        </div>

        {temAluguer && (
          <div className="mt-8 border-t border-marfim-200 pt-6 text-sm text-tinta-70">
            <h2 className="font-display text-lg text-tinta">Sobre o aluguer</h2>
            <p className="mt-2">
              A peça fica reservada em seu nome. A caução é devolvida depois de a peça voltar ao
              ateliê em bom estado. Atrasos na devolução são cobrados ao preço de um dia de
              aluguer.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-marfim-200 pt-6">
          <Link href="/loja" className="btn btn-contorno">
            Continuar a ver peças
          </Link>
          <Link href="/conta" className="btn btn-escuro">
            Os meus pedidos
          </Link>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-tinta-50">
        Guarde este número: {pedido.number}. Pode consultá-lo em qualquer altura nesta página.
      </p>
    </div>
  );
}
