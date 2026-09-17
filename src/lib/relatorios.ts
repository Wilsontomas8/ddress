import "server-only";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, payments } from "@/db/schema";
import { METODO_PAGAMENTO } from "./labels";
import type { PaymentMethod } from "@/db/schema";

/** Estados que contam como negócio fechado no mês */
export const ESTADOS_FACTURAVEIS = [
  "PAGO",
  "PRONTO",
  "ENTREGUE",
  "EM_ALUGUER",
  "DEVOLVIDO",
  "CONCLUIDO",
] as const;

export type LinhaDoRelatorio = {
  numero: string;
  data: Date;
  cliente: string;
  tipo: "Venda" | "Aluguer" | "Misto";
  estado: string;
  metodo: string;
  vendas: number;
  alugueres: number;
  caucao: number;
  entrega: number;
  total: number;
};

export type RelatorioMensal = {
  mes: string;
  inicio: Date;
  fim: Date;
  linhas: LinhaDoRelatorio[];
  totais: {
    pedidos: number;
    vendas: number;
    alugueres: number;
    caucoesCobradas: number;
    caucoesDevolvidas: number;
    entregas: number;
    facturado: number;
  };
  porMetodo: { metodo: string; pedidos: number; valor: number }[];
};

/** "2026-09" → intervalo do mês em UTC */
function intervaloDoMes(mes: string): { inicio: Date; fim: Date } {
  const [ano, m] = mes.split("-").map(Number);
  const inicio = new Date(Date.UTC(ano, m - 1, 1));
  const fim = new Date(Date.UTC(ano, m, 1));
  return { inicio, fim };
}

export function mesAtual(): string {
  const hoje = new Date();
  return `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function relatorioMensal(mes: string): Promise<RelatorioMensal> {
  const { inicio, fim } = intervaloDoMes(mes);

  const pedidos = await db
    .select()
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, inicio),
        lt(orders.createdAt, fim),
        inArray(orders.status, [...ESTADOS_FACTURAVEIS])
      )
    )
    .orderBy(orders.createdAt);

  const ids = pedidos.map((p) => p.id);

  const [itens, movimentos] = await Promise.all([
    ids.length
      ? db.select().from(orderItems).where(inArray(orderItems.orderId, ids))
      : Promise.resolve([]),
    ids.length
      ? db.select().from(payments).where(inArray(payments.orderId, ids))
      : Promise.resolve([]),
  ]);

  const linhas: LinhaDoRelatorio[] = pedidos.map((p) => {
    const meus = itens.filter((i) => i.orderId === p.id);
    const vendas = meus
      .filter((i) => i.kind === "VENDA")
      .reduce((t, i) => t + i.lineTotal, 0);
    const alugueres = meus
      .filter((i) => i.kind === "ALUGUER")
      .reduce((t, i) => t + i.lineTotal, 0);

    const temVenda = vendas > 0;
    const temAluguer = alugueres > 0;

    return {
      numero: p.number,
      data: p.createdAt,
      cliente: p.customerName,
      tipo: temVenda && temAluguer ? "Misto" : temAluguer ? "Aluguer" : "Venda",
      estado: p.status,
      metodo: METODO_PAGAMENTO[p.paymentMethod].label,
      vendas,
      alugueres,
      caucao: p.depositTotal,
      entrega: p.deliveryFee,
      total: p.total,
    };
  });

  const caucoesDevolvidas = movimentos
    .filter((m) => m.isDepositRefund && m.status === "REEMBOLSADO")
    .reduce((t, m) => t + m.amount, 0);

  const totais = {
    pedidos: linhas.length,
    vendas: linhas.reduce((t, l) => t + l.vendas, 0),
    alugueres: linhas.reduce((t, l) => t + l.alugueres, 0),
    caucoesCobradas: linhas.reduce((t, l) => t + l.caucao, 0),
    caucoesDevolvidas,
    entregas: linhas.reduce((t, l) => t + l.entrega, 0),
    // O que ficou de facto para a casa: peças e entregas, sem a caução,
    // que é dinheiro do cliente à guarda da loja.
    facturado: linhas.reduce((t, l) => t + l.vendas + l.alugueres + l.entrega, 0),
  };

  const metodos = new Map<PaymentMethod, { pedidos: number; valor: number }>();
  for (const p of pedidos) {
    const atual = metodos.get(p.paymentMethod) ?? { pedidos: 0, valor: 0 };
    atual.pedidos += 1;
    atual.valor += p.total - p.depositTotal;
    metodos.set(p.paymentMethod, atual);
  }

  return {
    mes,
    inicio,
    fim,
    linhas,
    totais,
    porMetodo: [...metodos.entries()].map(([metodo, v]) => ({
      metodo: METODO_PAGAMENTO[metodo].label,
      pedidos: v.pedidos,
      valor: v.valor,
    })),
  };
}

/** Relatório em CSV, pronto para abrir no Excel */
export function relatorioParaCSV(r: RelatorioMensal): string {
  const sep = ";"; // o Excel em português separa por ponto e vírgula
  const linhas: string[] = [];

  linhas.push(`Relatório mensal DDRESS${sep}${r.mes}`);
  linhas.push("");
  linhas.push(["Pedido", "Data", "Cliente", "Tipo", "Método", "Vendas", "Alugueres", "Caução", "Entrega", "Total"].join(sep));

  for (const l of r.linhas) {
    linhas.push(
      [
        l.numero,
        l.data.toISOString().slice(0, 10),
        `"${l.cliente.replace(/"/g, "'")}"`,
        l.tipo,
        l.metodo,
        l.vendas,
        l.alugueres,
        l.caucao,
        l.entrega,
        l.total,
      ].join(sep)
    );
  }

  linhas.push("");
  linhas.push(["Totais", "", "", "", "", r.totais.vendas, r.totais.alugueres, r.totais.caucoesCobradas, r.totais.entregas, r.totais.facturado].join(sep));
  linhas.push(`Cauções devolvidas${sep}${r.totais.caucoesDevolvidas}`);

  return linhas.join("\r\n");
}
