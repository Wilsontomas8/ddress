/**
 * Acompanhamento visual da encomenda.
 *
 * Traduz o estado interno do pedido para a linha de tempo que o cliente
 * vê, com os passos previstos no âmbito: pedido recebido, reserva em
 * validação, prova marcada ou dispensada, aluguer confirmado, factura e
 * pagamento, preparação, entrega, recolha, higienização e conclusão.
 */

import type { OrderStatus } from "@/db/schema";

export type EstadoDoPasso = "feito" | "actual" | "futuro" | "falhado";

export type Passo = {
  chave: string;
  titulo: string;
  descricao: string;
  estado: EstadoDoPasso;
};

/** Ordem interna dos estados, para saber o que já passou */
const ORDEM: OrderStatus[] = [
  "NOVO",
  "RECEBIDO",
  "AGUARDA_PROVA",
  "CONFIRMADO",
  "PAGO",
  "PRONTO",
  "EM_ALUGUER",
  "ENTREGUE",
  "DEVOLVIDO",
  "CONCLUIDO",
];

function posicao(estado: OrderStatus): number {
  const i = ORDEM.indexOf(estado);
  return i === -1 ? 0 : i;
}

export function passosDoPedido(opts: {
  status: OrderStatus;
  temAluguer: boolean;
  precisaProva: boolean;
  provaDispensada: boolean;
  temFactura: boolean;
  pago: boolean;
}): Passo[] {
  const { status, temAluguer, precisaProva, provaDispensada, temFactura, pago } = opts;

  if (status === "CANCELADO") {
    return [
      {
        chave: "recebido",
        titulo: "Pedido recebido",
        descricao: "O pedido entrou na loja.",
        estado: "feito",
      },
      {
        chave: "cancelado",
        titulo: "Pedido cancelado",
        descricao: "O pedido foi cancelado. As peças voltaram a ficar disponíveis.",
        estado: "falhado",
      },
    ];
  }

  const p = posicao(status);

  /** Um passo está feito quando o pedido já passou daquele ponto */
  const marca = (limite: OrderStatus, condicaoExtra = true): EstadoDoPasso => {
    const alvo = posicao(limite);
    if (p > alvo) return "feito";
    if (p === alvo) return condicaoExtra ? "feito" : "actual";
    return "futuro";
  };

  const passos: Passo[] = [
    {
      chave: "recebido",
      titulo: "Pedido recebido",
      descricao: "Recebemos o seu pedido no site.",
      estado: "feito",
    },
    {
      chave: "validacao",
      titulo: "Reserva em validação",
      descricao: "Um funcionário está a confirmar as peças e as datas consigo.",
      estado: marca("RECEBIDO", p > posicao("RECEBIDO")),
    },
  ];

  if (precisaProva || provaDispensada) {
    passos.push({
      chave: "prova",
      titulo: provaDispensada ? "Prova dispensada" : "Prova no ateliê",
      descricao: provaDispensada
        ? "Reside fora de Luanda: a prova foi dispensada mediante declaração."
        : "Experimenta a peça no ateliê à hora marcada.",
      estado: provaDispensada
        ? "feito"
        : marca("AGUARDA_PROVA", p > posicao("AGUARDA_PROVA")),
    });
  }

  passos.push({
    chave: "confirmado",
    titulo: temAluguer ? "Aluguer confirmado" : "Encomenda confirmada",
    descricao: "Peças, datas e valores fechados.",
    estado: marca("CONFIRMADO", p > posicao("CONFIRMADO")),
  });

  passos.push({
    chave: "factura",
    titulo: "Factura disponível",
    descricao: temFactura
      ? "A factura do seu pedido está emitida."
      : "A factura é emitida depois da confirmação.",
    estado: temFactura ? "feito" : p >= posicao("CONFIRMADO") ? "actual" : "futuro",
  });

  passos.push({
    chave: "pagamento",
    titulo: "Pagamento confirmado",
    descricao: pago ? "Pagamento recebido e confirmado." : "A aguardar confirmação do pagamento.",
    estado: pago ? "feito" : p >= posicao("CONFIRMADO") ? "actual" : "futuro",
  });

  passos.push({
    chave: "preparacao",
    titulo: "Em preparação",
    descricao: "A peça está a ser preparada para si.",
    estado: marca("PRONTO", p > posicao("PRONTO")),
  });

  passos.push({
    chave: "entrega",
    titulo: temAluguer ? "Peça entregue" : "Entrega",
    descricao: temAluguer
      ? "A peça está consigo durante o período combinado."
      : "A peça segue para entrega ou levantamento.",
    estado: temAluguer
      ? marca("EM_ALUGUER", p > posicao("EM_ALUGUER"))
      : marca("ENTREGUE", p > posicao("ENTREGUE")),
  });

  if (temAluguer) {
    passos.push({
      chave: "recolha",
      titulo: "Recolha",
      descricao: "A peça regressa ao ateliê na data combinada.",
      estado: marca("DEVOLVIDO", p > posicao("DEVOLVIDO")),
    });
    passos.push({
      chave: "higienizacao",
      titulo: "Higienização",
      descricao: "A peça é verificada e higienizada.",
      estado: p >= posicao("DEVOLVIDO") ? (p > posicao("DEVOLVIDO") ? "feito" : "actual") : "futuro",
    });
  }

  passos.push({
    chave: "concluido",
    titulo: "Concluído",
    descricao: temAluguer
      ? "Caução devolvida e processo fechado."
      : "Pedido concluído. Obrigado.",
    estado: status === "CONCLUIDO" ? "feito" : "futuro",
  });

  // Garante que existe no máximo um passo "actual": o primeiro por fazer.
  let jaMarcou = false;
  return passos.map((passo) => {
    if (passo.estado === "feito" || passo.estado === "falhado") return passo;
    if (!jaMarcou) {
      jaMarcou = true;
      return { ...passo, estado: "actual" as EstadoDoPasso };
    }
    return { ...passo, estado: "futuro" as EstadoDoPasso };
  });
}
