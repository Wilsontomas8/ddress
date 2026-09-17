/**
 * =====================================================================
 *  DDRESS — modelo de dados (Drizzle ORM / PostgreSQL)
 * =====================================================================
 *
 *  Loja com VENDA e ALUGUER, três secções (Homem, Mulher, Criança),
 *  calendário de disponibilidade por peça e marcação de prova no ateliê.
 *
 *  Dinheiro: todos os valores são Kwanzas INTEIROS (sem cêntimos).
 *            45000 = 45.000,00 Kz
 * =====================================================================
 */

import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// --------------------------------------------------------------------
//  ENUMERAÇÕES
// --------------------------------------------------------------------

/**
 * Perfis de acesso (matriz RBAC do âmbito).
 * CLIENTE só vê a loja; os restantes entram no painel, cada um com o
 * seu conjunto de secções — ver src/lib/permissoes.ts
 */
export const roleEnum = pgEnum("role", [
  "CLIENTE",
  "FUNCIONARIO",
  "ADMIN",
  "SUPORTE", // suporte técnico: diagnóstico e auditoria, sem gerir contas
  "CONTABILISTA", // leitura financeira e exportação de relatórios
  "MOTORISTA", // entregas e recolhas atribuídas
]);
export type Role = (typeof roleEnum.enumValues)[number];

export const sectionEnum = pgEnum("section", ["HOMEM", "MULHER", "CRIANCA"]);
export type Section = (typeof sectionEnum.enumValues)[number];

/** O que o produto permite */
export const offerEnum = pgEnum("offer", ["VENDA", "ALUGUER", "AMBOS"]);
export type Offer = (typeof offerEnum.enumValues)[number];

/** Como a linha do pedido foi adquirida */
export const itemKindEnum = pgEnum("item_kind", ["VENDA", "ALUGUER"]);
export type ItemKind = (typeof itemKindEnum.enumValues)[number];

/** Ciclo de vida do pedido, do site até ao fecho pelo funcionário */
export const orderStatusEnum = pgEnum("order_status", [
  "NOVO", // entrou no site, ainda ninguém pegou
  "RECEBIDO", // funcionário assumiu o pedido
  "AGUARDA_PROVA", // tem peça que exige prova no ateliê
  "CONFIRMADO", // prova feita ou dispensada
  "PAGO", // pagamento confirmado pelo funcionário
  "PRONTO", // preparado para levantamento/entrega
  "ENTREGUE", // venda concluída
  "EM_ALUGUER", // peça de aluguer está com o cliente
  "DEVOLVIDO", // peça voltou ao ateliê
  "CONCLUIDO", // caução devolvida, processo fechado
  "CANCELADO",
]);
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

/** Onde o cliente reside — decide se a prova é obrigatória */
export const residenceEnum = pgEnum("residence", ["LUANDA", "FORA_LUANDA"]);
export type Residence = (typeof residenceEnum.enumValues)[number];

export const paymentMethodEnum = pgEnum("payment_method", [
  "MULTICAIXA_EXPRESS",
  "TRANSFERENCIA",
  "NA_ENTREGA",
  "CARTAO",
]);
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDENTE",
  "EM_VERIFICACAO", // cliente enviou comprovativo, falta validar
  "PAGO",
  "PARCIAL",
  "REEMBOLSADO",
  "FALHADO",
]);
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "PENDENTE",
  "CONFIRMADA",
  "REALIZADA",
  "FALTOU",
  "CANCELADA",
]);
export type AppointmentStatus = (typeof appointmentStatusEnum.enumValues)[number];

/** Estado da reserva de uma peça no calendário de aluguer */
export const reservationStatusEnum = pgEnum("reservation_status", [
  "PROVISORIA", // segurada enquanto o pedido não é confirmado
  "CONFIRMADA",
  "ENTREGUE", // peça está com o cliente
  "EM_HIGIENIZACAO", // voltou ao ateliê, ainda não pode sair outra vez
  "DEVOLVIDA", // pronta: a peça volta ao catálogo
  "CANCELADA",
]);
export type ReservationStatus = (typeof reservationStatusEnum.enumValues)[number];

// --------------------------------------------------------------------
//  UTILIZADORES
// --------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    address: text("address"),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("CLIENTE"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_key").on(t.email), index("users_role_idx").on(t.role)]
);

// --------------------------------------------------------------------
//  CATÁLOGO
// --------------------------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    section: sectionEnum("section").notNull(),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    uniqueIndex("categories_section_slug_key").on(t.section, t.slug),
    index("categories_section_idx").on(t.section),
  ]
);

export const products = pgTable(
  "products",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    /** Instruções de conservação */
    care: text("care"),
    brand: text("brand"),
    section: sectionEnum("section").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),

    offer: offerEnum("offer").notNull().default("VENDA"),

    // --- preços em Kwanzas inteiros ---
    salePrice: integer("sale_price"),
    /** Preço riscado (promoção) */
    compareAtPrice: integer("compare_at_price"),
    rentalDayPrice: integer("rental_day_price"),
    /** Pacote fim-de-semana (sexta → segunda) */
    rentalWeekendPrice: integer("rental_weekend_price"),
    /** Caução reembolsável */
    rentalDeposit: integer("rental_deposit"),

    minRentalDays: integer("min_rental_days").notNull().default(1),
    maxRentalDays: integer("max_rental_days").notNull().default(14),
    /** Dias de higienização depois da devolução, antes de nova reserva */
    cleaningBufferDays: integer("cleaning_buffer_days").notNull().default(2),

    /** Exige prova presencial no ateliê antes de confirmar */
    requiresFitting: boolean("requires_fitting").notNull().default(false),

    featured: boolean("featured").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("products_slug_key").on(t.slug),
    index("products_section_idx").on(t.section, t.active),
    index("products_category_idx").on(t.categoryId),
    index("products_offer_idx").on(t.offer),
  ]
);

export const productImages = pgTable(
  "product_images",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("product_images_product_idx").on(t.productId)]
);

/**
 * A VARIANTE é a peça concreta: tamanho + cor.
 * É a este nível que existe stock, calendário de aluguer e calendário
 * de prova — é por isso que o cliente vê disponibilidade "por peça".
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    /** S, M, L, 38, 40, 6 anos... */
    size: text("size").notNull(),
    color: text("color").notNull(),

    /** Unidades para VENDA */
    saleStock: integer("sale_stock").notNull().default(0),
    /** Exemplares físicos destinados a ALUGUER */
    rentalStock: integer("rental_stock").notNull().default(0),

    active: boolean("active").notNull().default(true),
  },
  (t) => [
    uniqueIndex("product_variants_sku_key").on(t.sku),
    index("product_variants_product_idx").on(t.productId),
  ]
);

// --------------------------------------------------------------------
//  PEDIDOS
// --------------------------------------------------------------------

export const orders = pgTable(
  "orders",
  {
    id: id(),
    /** DDR-2026-0001 */
    number: text("number").notNull(),

    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),

    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email"),
    customerAddress: text("customer_address"),

    /**
     * Residência declarada pelo cliente.
     * A prova no ateliê é obrigatória em Luanda; fora de Luanda pode ser
     * dispensada mediante declaração de responsabilidade.
     */
    customerResidence: residenceEnum("customer_residence").notNull().default("LUANDA"),
    /** Prova dispensada por o cliente residir fora de Luanda */
    fittingWaived: boolean("fitting_waived").notNull().default(false),
    /** Momento em que a declaração de responsabilidade foi aceite */
    waiverAcceptedAt: timestamp("waiver_accepted_at", { withTimezone: true }),

    status: orderStatusEnum("status").notNull().default("NOVO"),

    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDENTE"),

    // --- totais em Kwanzas inteiros ---
    subtotal: integer("subtotal").notNull().default(0),
    depositTotal: integer("deposit_total").notNull().default(0),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    total: integer("total").notNull().default(0),

    /** Há pelo menos uma peça que exige prova no ateliê */
    needsFitting: boolean("needs_fitting").notNull().default(false),

    customerNote: text("customer_note"),
    staffNote: text("staff_note"),

    assignedToId: text("assigned_to_id").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_number_key").on(t.number),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    index("orders_assigned_idx").on(t.assignedToId),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id),

    /** Fotografia do momento da compra — o preço pode mudar depois */
    productName: text("product_name").notNull(),
    variantLabel: text("variant_label").notNull(),
    imageUrl: text("image_url"),

    kind: itemKindEnum("kind").notNull(),
    quantity: integer("quantity").notNull().default(1),

    /** Venda: preço unitário. Aluguer: preço total do período. */
    unitPrice: integer("unit_price").notNull(),
    deposit: integer("deposit").notNull().default(0),
    lineTotal: integer("line_total").notNull(),

    // --- apenas para ALUGUER ---
    startDate: date("start_date", { mode: "date" }),
    endDate: date("end_date", { mode: "date" }),
    days: integer("days"),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)]
);

/**
 * Bloqueio de uma peça no calendário de aluguer.
 * Serve para pedidos de clientes e para bloqueios manuais do
 * funcionário (manutenção, sessão fotográfica, etc.).
 */
export const rentalReservations = pgTable(
  "rental_reservations",
  {
    id: id(),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),

    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    orderItemId: text("order_item_id").references(() => orderItems.id, {
      onDelete: "set null",
    }),

    /** Dia de levantamento (inclusive) */
    startDate: date("start_date", { mode: "date" }).notNull(),
    /** Dia de devolução combinado (inclusive) */
    endDate: date("end_date", { mode: "date" }).notNull(),
    /**
     * Último dia em que a peça está bloqueada.
     * Fica disponível no dia seguinte a esta data.
     * Começa em endDate + dias de higienização do produto, e o
     * funcionário pode corrigi-lo quando regista a devolução.
     */
    blockUntil: date("block_until", { mode: "date" }).notNull(),

    /** Dia em que a peça voltou mesmo ao ateliê (pode não ser o combinado) */
    returnedAt: date("returned_at", { mode: "date" }),
    /** Quem registou a devolução e a higienização */
    returnedById: text("returned_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Notas da higienização: lavandaria, arranjos, estragos */
    cleaningNote: text("cleaning_note"),

    status: reservationStatusEnum("status").notNull().default("PROVISORIA"),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("rental_reservations_variant_idx").on(t.variantId, t.startDate, t.blockUntil),
    index("rental_reservations_status_idx").on(t.status),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    method: paymentMethodEnum("method").notNull(),
    amount: integer("amount").notNull(),
    /** Referência Multicaixa / número da operação */
    reference: text("reference"),
    /** Comprovativo de transferência enviado pelo cliente */
    proofUrl: text("proof_url"),
    status: paymentStatusEnum("status").notNull().default("PENDENTE"),

    /** Devolução da caução no fim do aluguer */
    isDepositRefund: boolean("is_deposit_refund").notNull().default(false),

    confirmedById: text("confirmed_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_order_idx").on(t.orderId), index("payments_status_idx").on(t.status)]
);

/** Histórico do pedido — quem fez o quê e quando */
export const orderEvents = pgTable(
  "order_events",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** CRIADO, ATRIBUIDO, ESTADO, PAGAMENTO, PROVA, NOTA */
    type: text("type").notNull(),
    message: text("message").notNull(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)]
);

// --------------------------------------------------------------------
//  MARCAÇÕES DE PROVA NO ATELIÊ
// --------------------------------------------------------------------

/**
 * Ligada à PEÇA (variante) para que o calendário só ofereça dias em
 * que aquela peça está mesmo no ateliê.
 */
export const appointments = pgTable(
  "appointments",
  {
    id: id(),
    code: text("code").notNull(),

    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),

    /** Permite marcar sem conta criada */
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email"),

    productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: text("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),

    /** Dia da prova */
    date: date("date", { mode: "date" }).notNull(),
    /** "HH:mm" */
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),

    status: appointmentStatusEnum("status").notNull().default("PENDENTE"),
    notes: text("notes"),
    /** Notas do funcionário depois da prova (medidas, ajustes) */
    staffNotes: text("staff_notes"),

    staffId: text("staff_id").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("appointments_code_key").on(t.code),
    index("appointments_date_idx").on(t.date, t.startTime),
    index("appointments_variant_idx").on(t.variantId, t.date),
    index("appointments_status_idx").on(t.status),
  ]
);

// --------------------------------------------------------------------
//  CONFIGURAÇÃO DA LOJA E DO ATELIÊ  (uma única linha, id = "default")
// --------------------------------------------------------------------

export const settings = pgTable("settings", {
  id: text("id").primaryKey().default("default"),

  storeName: text("store_name").notNull().default("DDRESS"),
  tagline: text("tagline").notNull().default("Aluguer e venda de vestidos"),
  phone: text("phone").notNull().default("+244 900 000 000"),
  whatsapp: text("whatsapp").notNull().default("+244 900 000 000"),
  email: text("email").notNull().default("wilitsolution@gmail.com"),
  address: text("address").notNull().default("Luanda, Angola"),

  // --- método TRANSFERÊNCIA ---
  bankName: text("bank_name").notNull().default("Banco BAI"),
  accountHolder: text("account_holder").notNull().default("DDRESS"),
  iban: text("iban").notNull().default("AO06 0000 0000 0000 0000 0000 0"),

  /** Número que recebe o Multicaixa Express */
  multicaixaNumber: text("multicaixa_number").notNull().default("+244 900 000 000"),

  deliveryFee: integer("delivery_fee").notNull().default(2000),

  // --- agenda do ateliê ---
  /** 0 = domingo ... 6 = sábado */
  openDays: integer("open_days").array().notNull().default([1, 2, 3, 4, 5, 6]),
  openHour: text("open_hour").notNull().default("09:00"),
  closeHour: text("close_hour").notNull().default("18:00"),
  /** Duração de cada slot de prova, em minutos */
  slotMinutes: integer("slot_minutes").notNull().default(45),
  /** Provas em simultâneo (nº de cabines) */
  slotCapacity: integer("slot_capacity").notNull().default(2),
  /** Antecedência mínima para marcar, em horas */
  minNoticeHours: integer("min_notice_hours").notNull().default(24),
  /** Até quantos dias no futuro se pode marcar */
  bookingHorizonDays: integer("booking_horizon_days").notNull().default(45),
  /** Feriados e dias fechados, "YYYY-MM-DD" */
  closedDates: text("closed_dates").array().notNull().default([]),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --------------------------------------------------------------------
//  RELAÇÕES
// --------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders, { relationName: "clienteDoPedido" }),
  appointments: many(appointments, { relationName: "clienteDaMarcacao" }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  variants: many(productVariants),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  reservations: many(rentalReservations),
  appointments: many(appointments),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
    relationName: "clienteDoPedido",
  }),
  assignedTo: one(users, {
    fields: [orders.assignedToId],
    references: [users.id],
    relationName: "funcionarioDoPedido",
  }),
  items: many(orderItems),
  payments: many(payments),
  events: many(orderEvents),
  appointments: many(appointments),
  reservations: many(rentalReservations),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const rentalReservationsRelations = relations(rentalReservations, ({ one }) => ({
  variant: one(productVariants, {
    fields: [rentalReservations.variantId],
    references: [productVariants.id],
  }),
  order: one(orders, { fields: [rentalReservations.orderId], references: [orders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  confirmedBy: one(users, {
    fields: [payments.confirmedById],
    references: [users.id],
  }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
  actor: one(users, { fields: [orderEvents.actorId], references: [users.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  user: one(users, {
    fields: [appointments.userId],
    references: [users.id],
    relationName: "clienteDaMarcacao",
  }),
  staff: one(users, {
    fields: [appointments.staffId],
    references: [users.id],
    relationName: "funcionarioDaMarcacao",
  }),
  product: one(products, {
    fields: [appointments.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [appointments.variantId],
    references: [productVariants.id],
  }),
  order: one(orders, { fields: [appointments.orderId], references: [orders.id] }),
}));

// --------------------------------------------------------------------
//  TIPOS INFERIDOS
// --------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type RentalReservation = typeof rentalReservations.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Settings = typeof settings.$inferSelect;
