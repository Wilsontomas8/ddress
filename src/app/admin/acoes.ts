"use server";

/**
 * Ações do painel de gestão.
 *
 * Tudo o que o funcionário faz passa por aqui: assumir o pedido, mudar
 * o estado, confirmar pagamentos, tratar da devolução da peça e da
 * caução, gerir a agenda do ateliê e o catálogo.
 *
 * Cada ação volta a validar a sessão no servidor — o painel não confia
 * no que vem do navegador.
 */

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  orderEvents,
  orderItems,
  orders,
  payments,
  productImages,
  productVariants,
  products,
  rentalReservations,
  settings,
  users,
  type AppointmentStatus,
  type Role,
  type OrderStatus,
  type PaymentMethod,
} from "@/db/schema";
import { exigirAdmin, exigirSeccao, hashPassword } from "@/lib/auth";
import { addDays, formatNumericDate, parseDay, today } from "@/lib/dates";
import { ESTADO_PEDIDO, PROXIMOS_ESTADOS } from "@/lib/labels";
import { libertarPedidoNaTransacao } from "@/lib/cancelamento";
import { avisarMudancaDeEstado } from "@/lib/notificacoes";

type Resultado = { ok: true; mensagem?: string } | { ok: false; erro: string };

function texto(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
function numero(v: FormDataEntryValue | null): number {
  const n = parseInt(texto(v).replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}
function numeroOuNulo(v: FormDataEntryValue | null): number | null {
  const s = texto(v);
  if (!s) return null;
  const n = parseInt(s.replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}
function slugificar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function registarEvento(
  orderId: string,
  tipo: string,
  mensagem: string,
  actorId: string
) {
  await db.insert(orderEvents).values({ orderId, type: tipo, message: mensagem, actorId });
}

function recarregarPedido(id: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${id}`);
}

// =====================================================================
//  PEDIDOS
// =====================================================================

/** O funcionário assume o pedido: fica responsável por ele. */
export async function assumirPedido(orderId: string): Promise<Resultado> {
  const eu = await exigirSeccao("pedidos", "editar");

  const [pedido] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };

  await db
    .update(orders)
    .set({
      assignedToId: eu.id,
      status: pedido.status === "NOVO" ? "RECEBIDO" : pedido.status,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  await registarEvento(orderId, "ATRIBUIDO", `Pedido assumido por ${eu.name}.`, eu.id);
  recarregarPedido(orderId);
  return { ok: true, mensagem: "Pedido assumido." };
}

/**
 * Muda o estado do pedido e mantém as reservas das peças em sintonia:
 * confirmar segura a peça, entregar marca-a como fora, devolver
 * liberta-a para outro cliente, cancelar devolve tudo atrás.
 */
export async function mudarEstadoPedido(
  orderId: string,
  novoEstado: OrderStatus
): Promise<Resultado> {
  const eu = await exigirSeccao("pedidos", "editar");

  const [pedido] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };

  const permitidos = PROXIMOS_ESTADOS[pedido.status];
  if (!permitidos.includes(novoEstado)) {
    return {
      ok: false,
      erro: `Não se pode passar de "${ESTADO_PEDIDO[pedido.status].label}" para "${ESTADO_PEDIDO[novoEstado].label}".`,
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: novoEstado,
        paymentStatus:
          novoEstado === "PAGO" ? "PAGO" : novoEstado === "CANCELADO" ? "FALHADO" : pedido.paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // --- reservas de aluguer acompanham o estado do pedido ---
    if (novoEstado === "CONFIRMADO" || novoEstado === "PAGO") {
      await tx
        .update(rentalReservations)
        .set({ status: "CONFIRMADA", updatedAt: new Date() })
        .where(
          and(
            eq(rentalReservations.orderId, orderId),
            eq(rentalReservations.status, "PROVISORIA")
          )
        );
    }

    if (novoEstado === "EM_ALUGUER") {
      await tx
        .update(rentalReservations)
        .set({ status: "ENTREGUE", updatedAt: new Date() })
        .where(
          and(
            eq(rentalReservations.orderId, orderId),
            inArray(rentalReservations.status, ["PROVISORIA", "CONFIRMADA"])
          )
        );
    }

    // Peça devolvida: entra em higienização até ao dia calculado a
    // partir dos dias de higienização do produto. O funcionário pode
    // corrigir estas datas a seguir, na ficha do pedido.
    if (novoEstado === "DEVOLVIDO") {
      const hoje = today();
      const linhas = await tx
        .select({
          id: rentalReservations.id,
          higienizacao: products.cleaningBufferDays,
        })
        .from(rentalReservations)
        .innerJoin(productVariants, eq(rentalReservations.variantId, productVariants.id))
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(
          and(
            eq(rentalReservations.orderId, orderId),
            inArray(rentalReservations.status, ["PROVISORIA", "CONFIRMADA", "ENTREGUE"])
          )
        );

      for (const l of linhas) {
        const emHigienizacao = l.higienizacao > 0;
        await tx
          .update(rentalReservations)
          .set({
            status: emHigienizacao ? "EM_HIGIENIZACAO" : "DEVOLVIDA",
            returnedAt: hoje,
            returnedById: eu.id,
            blockUntil: emHigienizacao ? addDays(hoje, l.higienizacao) : hoje,
            updatedAt: new Date(),
          })
          .where(eq(rentalReservations.id, l.id));
      }
    }

    if (novoEstado === "CANCELADO") {
      // liberta as peças, repõe o stock vendido e cancela as provas
      await libertarPedidoNaTransacao(tx, orderId);
    }
  });

  await registarEvento(
    orderId,
    "ESTADO",
    `Estado alterado para "${ESTADO_PEDIDO[novoEstado].label}" por ${eu.name}.`,
    eu.id
  );

  await avisarMudancaDeEstado(orderId, novoEstado);
  recarregarPedido(orderId);
  revalidatePath("/admin/alugueres");
  return { ok: true, mensagem: `Pedido em "${ESTADO_PEDIDO[novoEstado].label}".` };
}

/** Regista um pagamento recebido (e confirma-o, se for o caso). */
export async function registarPagamento(formData: FormData): Promise<Resultado> {
  const eu = await exigirSeccao("pedidos", "editar");
  const orderId = texto(formData.get("orderId"));
  const valor = numero(formData.get("valor"));
  const metodo = texto(formData.get("metodo")) as PaymentMethod;
  const referencia = texto(formData.get("referencia"));
  const confirmar = texto(formData.get("confirmar")) === "sim";

  if (!orderId) return { ok: false, erro: "Pedido em falta." };
  if (valor <= 0) return { ok: false, erro: "Indique o valor recebido." };

  const [pedido] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };

  await db.insert(payments).values({
    orderId,
    method: metodo || pedido.paymentMethod,
    amount: valor,
    reference: referencia || null,
    status: confirmar ? "PAGO" : "EM_VERIFICACAO",
    confirmedById: confirmar ? eu.id : null,
    confirmedAt: confirmar ? new Date() : null,
  });

  // Soma o que já está confirmado para saber se o pedido está saldado
  const recebidos = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.status, "PAGO")));

  const totalPago = recebidos
    .filter((p) => !p.isDepositRefund)
    .reduce((t, p) => t + p.amount, 0);

  await db
    .update(orders)
    .set({
      paymentStatus: !confirmar
        ? "EM_VERIFICACAO"
        : totalPago >= pedido.total
          ? "PAGO"
          : "PARCIAL",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  await registarEvento(
    orderId,
    "PAGAMENTO",
    `${confirmar ? "Pagamento confirmado" : "Pagamento registado por validar"}: ${valor.toLocaleString("pt-AO")} Kz${referencia ? ` (ref. ${referencia})` : ""}, por ${eu.name}.`,
    eu.id
  );

  recarregarPedido(orderId);
  return { ok: true, mensagem: confirmar ? "Pagamento confirmado." : "Pagamento registado." };
}

/** Valida um comprovativo que o cliente tinha enviado. */
export async function confirmarPagamento(paymentId: string): Promise<Resultado> {
  const eu = await exigirSeccao("pedidos", "editar");

  const [pag] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!pag) return { ok: false, erro: "Pagamento não encontrado." };

  await db
    .update(payments)
    .set({ status: "PAGO", confirmedById: eu.id, confirmedAt: new Date() })
    .where(eq(payments.id, paymentId));

  const [pedido] = await db.select().from(orders).where(eq(orders.id, pag.orderId));
  const confirmados = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, pag.orderId), eq(payments.status, "PAGO")));

  const totalPago = confirmados
    .filter((p) => !p.isDepositRefund)
    .reduce((t, p) => t + p.amount, 0);

  await db
    .update(orders)
    .set({
      paymentStatus: totalPago >= (pedido?.total ?? 0) ? "PAGO" : "PARCIAL",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, pag.orderId));

  await registarEvento(
    pag.orderId,
    "PAGAMENTO",
    `Comprovativo validado por ${eu.name}: ${pag.amount.toLocaleString("pt-AO")} Kz.`,
    eu.id
  );

  recarregarPedido(pag.orderId);
  return { ok: true, mensagem: "Pagamento confirmado." };
}

/** Devolve a caução ao cliente no fim do aluguer. */
export async function devolverCaucao(formData: FormData): Promise<Resultado> {
  const eu = await exigirSeccao("pedidos", "editar");
  const orderId = texto(formData.get("orderId"));
  const valor = numero(formData.get("valor"));
  const motivo = texto(formData.get("motivo"));

  const [pedido] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
  if (valor <= 0) return { ok: false, erro: "Indique o valor a devolver." };
  if (valor > pedido.depositTotal) {
    return { ok: false, erro: "O valor é superior à caução cobrada." };
  }

  await db.insert(payments).values({
    orderId,
    method: pedido.paymentMethod,
    amount: valor,
    status: "REEMBOLSADO",
    isDepositRefund: true,
    reference: motivo || "Devolução da caução",
    confirmedById: eu.id,
    confirmedAt: new Date(),
  });

  const retido = pedido.depositTotal - valor;
  await registarEvento(
    orderId,
    "PAGAMENTO",
    `Caução devolvida: ${valor.toLocaleString("pt-AO")} Kz${retido > 0 ? ` (retidos ${retido.toLocaleString("pt-AO")} Kz — ${motivo || "sem motivo indicado"})` : ""}, por ${eu.name}.`,
    eu.id
  );

  recarregarPedido(orderId);
  return { ok: true, mensagem: "Caução devolvida." };
}

/** Nota interna sobre o pedido, visível só para a equipa. */
export async function guardarNotaPedido(formData: FormData): Promise<Resultado> {
  const eu = await exigirSeccao("pedidos", "editar");
  const orderId = texto(formData.get("orderId"));
  const nota = texto(formData.get("nota"));

  await db
    .update(orders)
    .set({ staffNote: nota || null, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await registarEvento(orderId, "NOTA", `Nota interna atualizada por ${eu.name}.`, eu.id);
  recarregarPedido(orderId);
  return { ok: true, mensagem: "Nota guardada." };
}

// =====================================================================
//  MARCAÇÕES DE PROVA
// =====================================================================

export async function mudarEstadoMarcacao(
  id: string,
  estado: AppointmentStatus
): Promise<Resultado> {
  const eu = await exigirSeccao("provas", "editar");

  const [marcacao] = await db.select().from(appointments).where(eq(appointments.id, id));
  if (!marcacao) return { ok: false, erro: "Marcação não encontrada." };

  await db
    .update(appointments)
    .set({ status: estado, staffId: eu.id, updatedAt: new Date() })
    .where(eq(appointments.id, id));

  // Prova feita: o pedido deixa de estar à espera dela
  if (estado === "REALIZADA" && marcacao.orderId) {
    const [pedido] = await db.select().from(orders).where(eq(orders.id, marcacao.orderId));
    if (pedido?.status === "AGUARDA_PROVA") {
      await db
        .update(orders)
        .set({ status: "CONFIRMADO", updatedAt: new Date() })
        .where(eq(orders.id, marcacao.orderId));
      await db
        .update(rentalReservations)
        .set({ status: "CONFIRMADA", updatedAt: new Date() })
        .where(
          and(
            eq(rentalReservations.orderId, marcacao.orderId),
            eq(rentalReservations.status, "PROVISORIA")
          )
        );
      await registarEvento(
        marcacao.orderId,
        "PROVA",
        `Prova realizada. Pedido confirmado por ${eu.name}.`,
        eu.id
      );
    }
  }

  if (marcacao.orderId && estado !== "REALIZADA") {
    await registarEvento(
      marcacao.orderId,
      "PROVA",
      `Marcação ${marcacao.code}: ${estado.toLowerCase()}, por ${eu.name}.`,
      eu.id
    );
  }

  revalidatePath("/admin/marcacoes");
  revalidatePath("/admin");
  if (marcacao.orderId) recarregarPedido(marcacao.orderId);
  return { ok: true, mensagem: "Marcação atualizada." };
}

export async function guardarNotasProva(formData: FormData): Promise<Resultado> {
  await exigirSeccao("provas", "editar");
  const id = texto(formData.get("id"));
  const notas = texto(formData.get("staffNotes"));

  await db
    .update(appointments)
    .set({ staffNotes: notas || null, updatedAt: new Date() })
    .where(eq(appointments.id, id));

  revalidatePath("/admin/marcacoes");
  return { ok: true, mensagem: "Notas guardadas." };
}

// =====================================================================
//  CALENDÁRIO DAS PEÇAS
// =====================================================================

/**
 * Registo da devolução e da higienização de uma peça.
 *
 * O funcionário escreve o dia em que a peça voltou mesmo ao ateliê e o
 * dia a partir do qual pode voltar a sair. Enquanto esse dia não
 * chegar, a peça fica "em higienização" e não aparece no site — mesmo
 * que o aluguer já tenha terminado no papel.
 *
 * Serve tanto para registar pela primeira vez como para corrigir
 * depois (a lavandaria atrasou, apareceu um arranjo a fazer).
 */
export async function registarHigienizacao(formData: FormData): Promise<Resultado> {
  const eu = await exigirSeccao(["alugueres", "pedidos"], "editar");

  const reservationId = texto(formData.get("reservationId"));
  const devolvidaEmStr = texto(formData.get("devolvidaEm"));
  const disponivelEmStr = texto(formData.get("disponivelEm"));
  const nota = texto(formData.get("cleaningNote"));

  if (!reservationId) return { ok: false, erro: "Reserva em falta." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(devolvidaEmStr)) {
    return { ok: false, erro: "Indique o dia em que a peça voltou ao ateliê." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(disponivelEmStr)) {
    return { ok: false, erro: "Indique a partir de que dia a peça fica disponível." };
  }

  const devolvidaEm = parseDay(devolvidaEmStr);
  const disponivelEm = parseDay(disponivelEmStr);

  if (disponivelEm.getTime() < devolvidaEm.getTime()) {
    return {
      ok: false,
      erro: "A peça não pode ficar disponível antes do dia em que voltou.",
    };
  }

  const [reserva] = await db
    .select()
    .from(rentalReservations)
    .where(eq(rentalReservations.id, reservationId));
  if (!reserva) return { ok: false, erro: "Reserva não encontrada." };

  // blockUntil é o último dia bloqueado; a peça sai no dia seguinte.
  const blockUntil = addDays(disponivelEm, -1);
  const hoje = today();
  const aindaPresa = blockUntil.getTime() >= hoje.getTime();

  await db
    .update(rentalReservations)
    .set({
      status: aindaPresa ? "EM_HIGIENIZACAO" : "DEVOLVIDA",
      returnedAt: devolvidaEm,
      returnedById: eu.id,
      blockUntil,
      cleaningNote: nota || null,
      updatedAt: new Date(),
    })
    .where(eq(rentalReservations.id, reservationId));

  // Se o pedido ainda estava "em aluguer", passa a devolvido.
  if (reserva.orderId) {
    const [pedido] = await db.select().from(orders).where(eq(orders.id, reserva.orderId));
    if (pedido?.status === "EM_ALUGUER") {
      await db
        .update(orders)
        .set({ status: "DEVOLVIDO", updatedAt: new Date() })
        .where(eq(orders.id, reserva.orderId));
    }

    await registarEvento(
      reserva.orderId,
      "ESTADO",
      `Peça devolvida a ${formatNumericDate(devolvidaEm)}; ${
        aindaPresa
          ? `em higienização até ${formatNumericDate(blockUntil)}, disponível a ${formatNumericDate(disponivelEm)}`
          : "já disponível"
      }${nota ? ` — ${nota}` : ""}. Registado por ${eu.name}.`,
      eu.id
    );
    recarregarPedido(reserva.orderId);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/alugueres");
  revalidatePath("/admin/produtos");

  return {
    ok: true,
    mensagem: aindaPresa
      ? `Em higienização. Volta ao site a ${formatNumericDate(disponivelEm)}.`
      : "Registado. A peça já está disponível no site.",
  };
}

/** Bloqueio manual de uma peça (manutenção, sessão fotográfica, aluguer no balcão). */
export async function bloquearPeca(formData: FormData): Promise<Resultado> {
  const eu = await exigirSeccao("alugueres", "editar");
  const variantId = texto(formData.get("variantId"));
  const inicioStr = texto(formData.get("inicio"));
  const fimStr = texto(formData.get("fim"));
  const nota = texto(formData.get("nota"));

  if (!variantId || !inicioStr || !fimStr) {
    return { ok: false, erro: "Indique a peça e as datas." };
  }

  const [variante] = await db
    .select({ v: productVariants, p: products })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(productVariants.id, variantId));

  if (!variante) return { ok: false, erro: "Peça não encontrada." };

  const inicio = parseDay(inicioStr);
  const fim = parseDay(fimStr);
  if (fim.getTime() < inicio.getTime()) {
    return { ok: false, erro: "A data final é anterior à inicial." };
  }

  await db.insert(rentalReservations).values({
    variantId,
    startDate: inicio,
    endDate: fim,
    blockUntil: addDays(fim, variante.p.cleaningBufferDays),
    status: "CONFIRMADA",
    note: nota || `Bloqueio manual por ${eu.name}.`,
  });

  revalidatePath("/admin/alugueres");
  revalidatePath("/admin/produtos");
  return { ok: true, mensagem: "Peça bloqueada no calendário." };
}

/** Liberta uma peça: a reserva deixa de contar e a peça volta ao catálogo. */
export async function libertarPeca(reservationId: string): Promise<Resultado> {
  const eu = await exigirSeccao("alugueres", "editar");

  const [reserva] = await db
    .select()
    .from(rentalReservations)
    .where(eq(rentalReservations.id, reservationId));
  if (!reserva) return { ok: false, erro: "Reserva não encontrada." };

  await db
    .update(rentalReservations)
    .set({ status: "DEVOLVIDA", updatedAt: new Date() })
    .where(eq(rentalReservations.id, reservationId));

  if (reserva.orderId) {
    await registarEvento(
      reserva.orderId,
      "ESTADO",
      `Peça libertada no calendário por ${eu.name}.`,
      eu.id
    );
  }

  revalidatePath("/admin/alugueres");
  revalidatePath("/admin/produtos");
  return { ok: true, mensagem: "Peça libertada. Volta a aparecer no site." };
}

// =====================================================================
//  CATÁLOGO
// =====================================================================

export async function guardarProduto(formData: FormData): Promise<Resultado> {
  await exigirSeccao("produtos", "editar");

  const id = texto(formData.get("id"));
  const nome = texto(formData.get("name"));
  const categoryId = texto(formData.get("categoryId"));
  const seccao = texto(formData.get("section")) as "HOMEM" | "MULHER" | "CRIANCA";
  const oferta = texto(formData.get("offer")) as "VENDA" | "ALUGUER" | "AMBOS";

  if (!nome) return { ok: false, erro: "Indique o nome da peça." };
  if (!categoryId) return { ok: false, erro: "Escolha a categoria." };

  const valores = {
    name: nome,
    description: texto(formData.get("description")),
    care: texto(formData.get("care")) || null,
    brand: texto(formData.get("brand")) || null,
    section: seccao,
    categoryId,
    offer: oferta,
    salePrice: numeroOuNulo(formData.get("salePrice")),
    compareAtPrice: numeroOuNulo(formData.get("compareAtPrice")),
    rentalDayPrice: numeroOuNulo(formData.get("rentalDayPrice")),
    rentalWeekendPrice: numeroOuNulo(formData.get("rentalWeekendPrice")),
    rentalDeposit: numeroOuNulo(formData.get("rentalDeposit")),
    minRentalDays: Math.max(1, numero(formData.get("minRentalDays")) || 1),
    maxRentalDays: Math.max(1, numero(formData.get("maxRentalDays")) || 14),
    cleaningBufferDays: Math.max(0, numero(formData.get("cleaningBufferDays"))),
    requiresFitting: texto(formData.get("requiresFitting")) === "sim",
    featured: texto(formData.get("featured")) === "sim",
    active: texto(formData.get("active")) !== "nao",
    updatedAt: new Date(),
  };

  if (oferta !== "ALUGUER" && !valores.salePrice) {
    return { ok: false, erro: "Uma peça à venda precisa de preço de venda." };
  }
  if (oferta !== "VENDA" && !valores.rentalDayPrice) {
    return { ok: false, erro: "Uma peça de aluguer precisa de preço por dia." };
  }

  let produtoId = id;

  if (id) {
    await db.update(products).set(valores).where(eq(products.id, id));
  } else {
    let slug = slugificar(nome);
    const [existente] = await db.select().from(products).where(eq(products.slug, slug));
    if (existente) slug = `${slug}-${Date.now().toString().slice(-4)}`;

    const [novo] = await db
      .insert(products)
      .values({ ...valores, slug })
      .returning();
    produtoId = novo.id;
  }

  const imagem = texto(formData.get("imagem"));
  if (imagem && produtoId) {
    const [jaTem] = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, produtoId));
    if (jaTem) {
      await db.update(productImages).set({ url: imagem }).where(eq(productImages.id, jaTem.id));
    } else {
      await db
        .insert(productImages)
        .values({ productId: produtoId, url: imagem, alt: nome, position: 0 });
    }
  }

  revalidatePath("/admin/produtos");
  revalidatePath("/loja");
  if (produtoId) revalidatePath(`/admin/produtos/${produtoId}`);
  return { ok: true, mensagem: id ? "Peça atualizada." : "Peça criada." };
}

export async function guardarVariante(formData: FormData): Promise<Resultado> {
  await exigirSeccao("produtos", "editar");

  const id = texto(formData.get("id"));
  const productId = texto(formData.get("productId"));
  const size = texto(formData.get("size"));
  const color = texto(formData.get("color"));

  if (!size || !color) return { ok: false, erro: "Indique tamanho e cor." };

  const valores = {
    size,
    color,
    saleStock: Math.max(0, numero(formData.get("saleStock"))),
    rentalStock: Math.max(0, numero(formData.get("rentalStock"))),
    active: texto(formData.get("active")) !== "nao",
  };

  if (id) {
    await db.update(productVariants).set(valores).where(eq(productVariants.id, id));
  } else {
    if (!productId) return { ok: false, erro: "Peça em falta." };
    const sku = `${slugificar(size)}-${slugificar(color)}-${Date.now().toString().slice(-5)}`;
    await db.insert(productVariants).values({ ...valores, productId, sku });
  }

  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/admin/produtos");
  return { ok: true, mensagem: "Tamanho guardado." };
}

export async function apagarVariante(id: string, productId: string): Promise<Resultado> {
  await exigirSeccao("produtos", "editar");

  const reservas = await db
    .select()
    .from(rentalReservations)
    .where(
      and(
        eq(rentalReservations.variantId, id),
        inArray(rentalReservations.status, ["PROVISORIA", "CONFIRMADA", "ENTREGUE"])
      )
    );

  if (reservas.length > 0) {
    return {
      ok: false,
      erro: "Esta peça tem reservas ativas. Liberte-as antes de a remover.",
    };
  }

  // Desativar em vez de apagar: o histórico de pedidos precisa da peça.
  await db.update(productVariants).set({ active: false }).where(eq(productVariants.id, id));

  revalidatePath(`/admin/produtos/${productId}`);
  return { ok: true, mensagem: "Tamanho desativado." };
}

// =====================================================================
//  EQUIPA E DEFINIÇÕES  (só administrador)
// =====================================================================

/** Só https, para o mapa não abrir nada estranho */
function ligacaoSegura(v: string): string {
  return /^https:\/\//i.test(v) ? v : "";
}

/** Coordenada decimal; vazio quando não é um número */
function coordenada(v: string): string {
  const n = Number(v.replace(",", "."));
  return v && Number.isFinite(n) ? String(n) : "";
}

export async function guardarDefinicoes(formData: FormData): Promise<Resultado> {
  // Administrador e suporte técnico podem alterar definições da loja.
  await exigirSeccao("definicoes", "editar");

  const diasAbertos = [0, 1, 2, 3, 4, 5, 6].filter(
    (d) => texto(formData.get(`dia-${d}`)) === "sim"
  );

  const feriados = texto(formData.get("closedDates"))
    .split(/[\s,;]+/)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

  await db
    .update(settings)
    .set({
      storeName: texto(formData.get("storeName")) || "DDRESS",
      tagline: texto(formData.get("tagline")),
      phone: texto(formData.get("phone")),
      whatsapp: texto(formData.get("whatsapp")),
      email: texto(formData.get("email")),
      address: texto(formData.get("address")),
      mapsUrl: ligacaoSegura(texto(formData.get("mapsUrl"))),
      latitude: coordenada(texto(formData.get("latitude"))),
      longitude: coordenada(texto(formData.get("longitude"))),
      bankName: texto(formData.get("bankName")),
      accountHolder: texto(formData.get("accountHolder")),
      iban: texto(formData.get("iban")),
      multicaixaNumber: texto(formData.get("multicaixaNumber")),
      deliveryFee: Math.max(0, numero(formData.get("deliveryFee"))),
      openDays: diasAbertos.length ? diasAbertos : [1, 2, 3, 4, 5, 6],
      openHour: texto(formData.get("openHour")) || "09:00",
      closeHour: texto(formData.get("closeHour")) || "18:00",
      slotMinutes: Math.max(15, numero(formData.get("slotMinutes")) || 45),
      slotCapacity: Math.max(1, numero(formData.get("slotCapacity")) || 1),
      minNoticeHours: Math.max(0, numero(formData.get("minNoticeHours"))),
      bookingHorizonDays: Math.max(7, numero(formData.get("bookingHorizonDays")) || 45),
      reservationExpiryHours: Math.min(168, Math.max(1, numero(formData.get("reservationExpiryHours")) || 24)),
      assistantEnabled: formData.get("assistantEnabled") === "on",
      assistantName: texto(formData.get("assistantName")) || "Joyce",
      assistantGreeting:
        texto(formData.get("assistantGreeting")) ||
        "Bem-vindo(a) à DDRESS, sou a Joyce, assistente comercial. Em que posso ajudar?",
      closedDates: feriados,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, "default"));

  revalidatePath("/admin/definicoes");
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Definições guardadas." };
}

export async function guardarFuncionario(formData: FormData): Promise<Resultado> {
  await exigirAdmin();

  const id = texto(formData.get("id"));
  const nome = texto(formData.get("name"));
  const email = texto(formData.get("email")).toLowerCase();
  const telefone = texto(formData.get("phone"));
  const papel = texto(formData.get("role")) as Role;
  const password = texto(formData.get("password"));

  if (!nome || !email) return { ok: false, erro: "Indique nome e e-mail." };

  if (id) {
    const valores: Record<string, unknown> = {
      name: nome,
      email,
      phone: telefone || null,
      role: papel,
      active: texto(formData.get("active")) !== "nao",
      updatedAt: new Date(),
    };
    if (password) valores.passwordHash = await hashPassword(password);
    await db.update(users).set(valores).where(eq(users.id, id));
  } else {
    if (password.length < 6) {
      return { ok: false, erro: "A palavra-passe precisa de pelo menos 6 caracteres." };
    }
    const [existente] = await db.select().from(users).where(eq(users.email, email));
    if (existente) return { ok: false, erro: "Já existe uma conta com este e-mail." };

    await db.insert(users).values({
      name: nome,
      email,
      phone: telefone || null,
      role: papel,
      passwordHash: await hashPassword(password),
    });
  }

  revalidatePath("/admin/equipa");
  return { ok: true, mensagem: "Conta guardada." };
}

// =====================================================================
//  ENTREGAS E RECOLHAS  (motorista, funcionário e administrador)
// =====================================================================

/**
 * O motorista entregou a peça ao cliente.
 * Numa venda o pedido fica entregue; num aluguer passa a "em aluguer",
 * porque a peça ainda tem de voltar.
 */
export async function registarEntrega(orderId: string): Promise<Resultado> {
  const eu = await exigirSeccao("entregas", "editar");

  const [pedido] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
  if (pedido.status !== "PRONTO") {
    return { ok: false, erro: "Este pedido ainda não está pronto para entrega." };
  }

  const itens = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const temAluguer = itens.some((i) => i.kind === "ALUGUER");
  const novoEstado: OrderStatus = temAluguer ? "EM_ALUGUER" : "ENTREGUE";

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ status: novoEstado, updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    if (temAluguer) {
      await tx
        .update(rentalReservations)
        .set({ status: "ENTREGUE", updatedAt: new Date() })
        .where(
          and(
            eq(rentalReservations.orderId, orderId),
            inArray(rentalReservations.status, ["PROVISORIA", "CONFIRMADA"])
          )
        );
    }
  });

  await registarEvento(
    orderId,
    "ENTREGA",
    `Entrega registada por ${eu.name}${temAluguer ? " — peça em aluguer com o cliente." : "."}`,
    eu.id
  );

  revalidatePath("/admin/entregas");
  recarregarPedido(orderId);
  return { ok: true, mensagem: "Entrega registada." };
}

/** Tentativa de entrega sem sucesso: fica o registo, o estado não muda. */
export async function registarTentativaDeEntrega(formData: FormData): Promise<Resultado> {
  const eu = await exigirSeccao("entregas", "editar");

  const orderId = texto(formData.get("orderId"));
  const motivo = texto(formData.get("motivo"));
  if (!orderId) return { ok: false, erro: "Pedido em falta." };

  await registarEvento(
    orderId,
    "ENTREGA",
    `Tentativa de entrega sem sucesso, por ${eu.name}${motivo ? `: ${motivo}` : "."}`,
    eu.id
  );

  revalidatePath("/admin/entregas");
  recarregarPedido(orderId);
  return { ok: true, mensagem: "Tentativa registada." };
}

/**
 * O motorista recolheu a peça de aluguer.
 * A peça entra em higienização com os dias definidos no produto; o
 * funcionário pode depois acertar as datas em Alugueres.
 */
export async function registarRecolha(orderId: string): Promise<Resultado> {
  const eu = await exigirSeccao("entregas", "editar");

  const [pedido] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
  if (pedido.status !== "EM_ALUGUER") {
    return { ok: false, erro: "Este pedido não tem peças por recolher." };
  }

  const hoje = today();

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ status: "DEVOLVIDO", updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    const linhas = await tx
      .select({ id: rentalReservations.id, higienizacao: products.cleaningBufferDays })
      .from(rentalReservations)
      .innerJoin(productVariants, eq(rentalReservations.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(rentalReservations.orderId, orderId),
          inArray(rentalReservations.status, ["PROVISORIA", "CONFIRMADA", "ENTREGUE"])
        )
      );

    for (const l of linhas) {
      const emHigienizacao = l.higienizacao > 0;
      await tx
        .update(rentalReservations)
        .set({
          status: emHigienizacao ? "EM_HIGIENIZACAO" : "DEVOLVIDA",
          returnedAt: hoje,
          returnedById: eu.id,
          blockUntil: emHigienizacao ? addDays(hoje, l.higienizacao) : hoje,
          updatedAt: new Date(),
        })
        .where(eq(rentalReservations.id, l.id));
    }
  });

  await registarEvento(
    orderId,
    "RECOLHA",
    `Recolha registada por ${eu.name}. A peça entrou em higienização.`,
    eu.id
  );

  revalidatePath("/admin/entregas");
  revalidatePath("/admin/alugueres");
  recarregarPedido(orderId);
  return { ok: true, mensagem: "Recolha registada. A peça está em higienização." };
}
