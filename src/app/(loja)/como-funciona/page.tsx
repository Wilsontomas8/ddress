import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { formatKz } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Como funciona o aluguer" };

export default async function PaginaComoFunciona() {
  const loja = await getSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="regua font-display text-3xl">Como funciona</h1>

      <section className="mt-10">
        <h2 className="font-display text-xl">Comprar</h2>
        <p className="mt-3 text-sm leading-relaxed text-tinta-70">
          Escolhe a peça e o tamanho, junta ao carrinho e finaliza o pedido. O pedido entra no
          painel da loja, o nosso funcionário confirma o stock e o pagamento consigo e marca a
          entrega ou o levantamento. Se quiser experimentar antes de decidir, pode marcar uma
          prova no ateliê — é opcional nas peças de venda.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">Alugar</h2>
        <p className="mt-3 text-sm leading-relaxed text-tinta-70">
          Cada peça de aluguer tem o seu próprio calendário. Uma peça sem reserva está livre;
          uma peça já reservada sai do catálogo e só volta a aparecer depois de a reserva
          terminar e de a peça passar pela higienização. É por isso que às vezes vê “reservada
          até” com uma data: é o dia em que aquela peça volta a estar disponível.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-tinta-70">
          <li>• O preço depende do número de dias. Há pacote de fim-de-semana em várias peças.</li>
          <li>
            • É cobrada uma <strong>caução reembolsável</strong>, devolvida depois de a peça
            voltar em bom estado.
          </li>
          <li>• A prova no ateliê é obrigatória nas peças de cerimónia, para acertar medidas.</li>
          <li>• Atrasos na devolução são cobrados ao valor de um dia de aluguer por cada dia.</li>
          <li>• Danos além do uso normal são descontados na caução.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">A prova no ateliê</h2>
        <p className="mt-3 text-sm leading-relaxed text-tinta-70">
          O calendário de prova é feito peça a peça: só mostra dias em que aquela peça está
          fisicamente no ateliê e em que ainda há cabine livre. Marcamos com pelo menos{" "}
          {loja.minNoticeHours} horas de antecedência e cada prova dura cerca de{" "}
          {loja.slotMinutes} minutos.
        </p>
        <Link href="/marcacao" className="btn btn-principal mt-6">
          Marcar prova
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">Pagamentos</h2>
        <ul className="mt-3 space-y-2 text-sm text-tinta-70">
          <li>
            • <strong>Multicaixa Express</strong> para {loja.multicaixaNumber}.
          </li>
          <li>
            • <strong>Transferência bancária</strong> — {loja.bankName}, {loja.accountHolder},
            IBAN {loja.iban}. Envie o comprovativo por WhatsApp para {loja.whatsapp}.
          </li>
          <li>
            • <strong>Na entrega ou no ateliê</strong>, quando levantar a peça.
          </li>
          <li>
            • <strong>Cartão Visa/Mastercard</strong>, quando ativado pela loja.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">Entregas</h2>
        <p className="mt-3 text-sm leading-relaxed text-tinta-70">
          Levantamento sem custo em {loja.address}. Entrega ao domicílio em Luanda por{" "}
          {formatKz(loja.deliveryFee)}. Para fora de Luanda, fale connosco pelo {loja.phone}.
        </p>
      </section>
    </div>
  );
}
