import "server-only";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications, orders, partners, serviceRequests } from "@/db/schema";
import { enviarEmail } from "./email";
import { formatKz } from "./money";
import { getSettings } from "./settings";
import { ROTULO_SOLICITACAO } from "./solicitacoes-rotulos";

/**
 * Avisos da loja.
 *
 * Cada aviso fica registado (tabela notifications) com o canal e o estado,
 * e tem uma chave única: chamar duas vezes para o mesmo acontecimento não
 * duplica nada. O canal SITE aparece no painel (loja) ou na conta
 * (cliente); o canal EMAIL tenta enviar e guarda o resultado.
 *
 * Os avisos nunca fazem falhar a operação que os originou.
 */

type Publico = "CLIENTE" | "LOJA" | "PARCEIRO";

type NovoAviso = {
  publico: Publico;
  canal: "SITE" | "EMAIL";
  chave: string;
  titulo: string;
  corpo: string;
  ligacao?: string | null;
  userId?: string | null;
  destinatario?: string | null;
  orderId?: string | null;
  requestId?: string | null;
};

function urlDoSite(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");
}

async function criarAviso(a: NovoAviso) {
  const [criado] = await db
    .insert(notifications)
    .values({
      audience: a.publico,
      channel: a.canal,
      dedupeKey: `${a.chave}:${a.publico}:${a.canal}`,
      title: a.titulo,
      body: a.corpo,
      link: a.ligacao ?? null,
      userId: a.userId ?? null,
      recipient: a.destinatario ?? null,
      orderId: a.orderId ?? null,
      requestId: a.requestId ?? null,
      status: a.canal === "SITE" ? "ENVIADA" : "PENDENTE",
      sentAt: a.canal === "SITE" ? new Date() : null,
    })
    .onConflictDoNothing({ target: notifications.dedupeKey })
    .returning();

  if (!criado || a.canal !== "EMAIL" || !a.destinatario) return;

  const envio = await enviarEmail({
    para: a.destinatario,
    assunto: a.titulo,
    texto: a.corpo,
    ligacao: a.ligacao ? `${urlDoSite()}${a.ligacao}` : null,
  });
  await db
    .update(notifications)
    .set(
      envio.ok
        ? { status: "ENVIADA", sentAt: new Date() }
        : { status: envio.semConfiguracao ? "SEM_CONFIGURACAO" : "FALHADA", error: envio.erro }
    )
    .where(eq(notifications.id, criado.id));
}

async function seguro(nome: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.error(`[DDRESS] Aviso "${nome}" falhou:`, e);
  }
}

/** Pedido novo: a cliente recebe a confirmação e a loja o aviso de recepção. */
export async function avisarPedidoCriado(orderId: string) {
  await seguro("pedido criado", async () => {
    const [p] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!p) return;
    const loja = await getSettings();
    const primeiroNome = p.customerName.split(" ")[0];

    const corpoCliente = `Olá, ${primeiroNome}.\n\nRecebemos o seu pedido ${p.number}, no valor de ${formatKz(p.total)}. Vamos contactá-la pelo ${p.customerPhone} para confirmar peças, datas e pagamento.\n\nPode acompanhar o pedido a qualquer momento no site.`;
    if (p.userId) {
      await criarAviso({ publico: "CLIENTE", canal: "SITE", chave: `pedido:${p.id}:criado`, titulo: `Pedido ${p.number} recebido`, corpo: corpoCliente, ligacao: `/pedido/${p.number}`, userId: p.userId, orderId: p.id });
    }
    if (p.customerEmail) {
      await criarAviso({ publico: "CLIENTE", canal: "EMAIL", chave: `pedido:${p.id}:criado`, titulo: `DDRESS — recebemos o seu pedido ${p.number}`, corpo: corpoCliente, ligacao: `/pedido/${p.number}`, destinatario: p.customerEmail, orderId: p.id });
    }

    const corpoLoja = `Novo pedido ${p.number} de ${p.customerName} (${p.customerPhone}).\nTotal: ${formatKz(p.total)}${p.needsFitting ? "\nTem peças que exigem prova no ateliê." : ""}${p.customerNote ? `\nNota da cliente: ${p.customerNote}` : ""}`;
    await criarAviso({ publico: "LOJA", canal: "SITE", chave: `pedido:${p.id}:criado`, titulo: `Novo pedido ${p.number}`, corpo: corpoLoja, ligacao: `/admin/pedidos/${p.id}`, orderId: p.id });
    if (loja.email) {
      await criarAviso({ publico: "LOJA", canal: "EMAIL", chave: `pedido:${p.id}:criado`, titulo: `Novo pedido ${p.number} — ${p.customerName}`, corpo: corpoLoja, ligacao: `/admin/pedidos/${p.id}`, destinatario: loja.email, orderId: p.id });
    }
  });
}

const ESTADOS_AVISADOS: Record<string, string> = {
  CONFIRMADO: "foi confirmado",
  PAGO: "tem o pagamento confirmado",
  PRONTO: "está pronto para levantamento ou entrega",
  EM_ALUGUER: "foi entregue. Bom evento!",
  CONCLUIDO: "está concluído. Obrigado pela preferência",
  CANCELADO: "foi cancelado",
};

/** Mudança de estado relevante para a cliente */
export async function avisarMudancaDeEstado(orderId: string, estado: string) {
  const frase = ESTADOS_AVISADOS[estado];
  if (!frase) return;
  await seguro("mudança de estado", async () => {
    const [p] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!p) return;
    const corpo = `Olá, ${p.customerName.split(" ")[0]}.\n\nO seu pedido ${p.number} ${frase}.`;
    const chave = `pedido:${p.id}:estado:${estado}`;
    if (p.userId) await criarAviso({ publico: "CLIENTE", canal: "SITE", chave, titulo: `Pedido ${p.number}: ${frase}`, corpo, ligacao: `/pedido/${p.number}`, userId: p.userId, orderId: p.id });
    if (p.customerEmail) await criarAviso({ publico: "CLIENTE", canal: "EMAIL", chave, titulo: `DDRESS — pedido ${p.number}`, corpo, ligacao: `/pedido/${p.number}`, destinatario: p.customerEmail, orderId: p.id });
  });
}

/** Solicitação nova (maquilhagem ou sapatos): cliente, loja e parceira */
export async function avisarSolicitacaoCriada(requestId: string) {
  await seguro("solicitação criada", async () => {
    const [s] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId));
    if (!s) return;
    const loja = await getSettings();
    const [parceira] = s.partnerId ? await db.select().from(partners).where(eq(partners.id, s.partnerId)) : [];
    const tipo = ROTULO_SOLICITACAO[s.type as keyof typeof ROTULO_SOLICITACAO] ?? s.type;
    const quando = s.eventDate ? `\nData: ${s.eventDate.toISOString().slice(0, 10)}${s.eventTime ? ` às ${s.eventTime}` : ""}` : "";
    const detalhe = `${quando}${s.location ? `\nLocal: ${s.location}` : ""}${s.shoeSize ? `\nTamanho: ${s.shoeSize}` : ""}${s.notes ? `\nNotas: ${s.notes}` : ""}`;
    const chave = `solicitacao:${s.id}:criada`;

    const corpoCliente = `Olá, ${s.customerName.split(" ")[0]}.\n\nRecebemos a sua solicitação ${s.code} (${tipo.toLowerCase()}${parceira ? ` com ${parceira.name}` : ""}). Vamos contactá-la pelo ${s.customerPhone}.${detalhe}`;
    if (s.userId) await criarAviso({ publico: "CLIENTE", canal: "SITE", chave, titulo: `Solicitação ${s.code} recebida`, corpo: corpoCliente, ligacao: "/conta", userId: s.userId, requestId: s.id });
    if (s.customerEmail) await criarAviso({ publico: "CLIENTE", canal: "EMAIL", chave, titulo: `DDRESS — solicitação ${s.code}`, corpo: corpoCliente, destinatario: s.customerEmail, requestId: s.id });

    const corpoLoja = `Nova solicitação ${s.code}: ${tipo}${parceira ? ` com ${parceira.name}` : ""}.\nCliente: ${s.customerName} (${s.customerPhone})${detalhe}`;
    await criarAviso({ publico: "LOJA", canal: "SITE", chave, titulo: `Nova solicitação ${s.code} — ${tipo}`, corpo: corpoLoja, ligacao: `/admin/solicitacoes/${s.id}`, requestId: s.id });
    if (loja.email) await criarAviso({ publico: "LOJA", canal: "EMAIL", chave, titulo: `Nova solicitação ${s.code} — ${tipo}`, corpo: corpoLoja, ligacao: `/admin/solicitacoes/${s.id}`, destinatario: loja.email, requestId: s.id });
    if (parceira?.email) {
      await criarAviso({ publico: "PARCEIRO", canal: "EMAIL", chave, titulo: `DDRESS — nova cliente para ${tipo.toLowerCase()} (${s.code})`, corpo: `Olá, ${parceira.name}.\n\nA DDRESS tem uma nova cliente interessada nos seus serviços.\nCliente: ${s.customerName} (${s.customerPhone})${detalhe}`, destinatario: parceira.email, requestId: s.id });
    }
  });
}

/** Avisos da loja por ler (canal SITE) — contador do painel */
export async function avisosDaLojaPorLer(): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.audience, "LOJA"), eq(notifications.channel, "SITE"), isNull(notifications.readAt)));
  return r?.n ?? 0;
}

export async function avisosDoCliente(userId: string, limite = 20) {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.channel, "SITE"), inArray(notifications.audience, ["CLIENTE"])))
    .orderBy(desc(notifications.createdAt))
    .limit(limite);
}
