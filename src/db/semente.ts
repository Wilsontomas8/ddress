/**
 * Dados iniciais da loja.
 *
 *   npm run db:seed
 *
 * Apaga o conteúdo das tabelas e volta a criar um catálogo de
 * demonstração com peças de venda, peças de aluguer, contas de acesso,
 * dois pedidos e duas marcações — o suficiente para ver o site e o
 * painel a funcionar.
 */

import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import type { BaseDeDados } from "./index";
import {
  appointments,
  categories,
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
  type Offer,
  type Section,
} from "./schema";

// ---------------------------------------------------------------- utils

function dia(offset: number): Date {
  const hoje = new Date();
  const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

function proximaSexta(aPartirDe = 7): Date {
  const d = dia(aPartirDe);
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function somaDias(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/**
 * Identificadores estáveis: a mesma semente gera sempre os mesmos ids.
 * Assim, onde a demonstração é recriada em várias instâncias (base embutida
 * na Vercel), uma sessão iniciada numa instância é reconhecida nas outras.
 */
let contadorDeIds = 0;
function uid(): string {
  const h = createHash("sha256").update(`ddress-semente-${++contadorDeIds}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// ------------------------------------------------------------- catálogo

type DefProduto = {
  nome: string;
  slug: string;
  seccao: Section;
  categoria: string;
  oferta: Offer;
  descricao: string;
  conservacao?: string;
  marca?: string;
  imagem: string;
  precoVenda?: number;
  precoAntigo?: number;
  precoDia?: number;
  precoFimDeSemana?: number;
  caucao?: number;
  provaObrigatoria?: boolean;
  destaque?: boolean;
  diasHigienizacao?: number;
  minDias?: number;
  variantes: {
    tamanho: string;
    cor: string;
    stockVenda?: number;
    stockAluguer?: number;
  }[];
};

const CATEGORIAS: { nome: string; slug: string; seccao: Section; pos: number }[] = [
  { nome: "Fatos e Cerimónia", slug: "fatos", seccao: "HOMEM", pos: 1 },
  { nome: "Camisas", slug: "camisas", seccao: "HOMEM", pos: 2 },
  { nome: "Casacos", slug: "casacos", seccao: "HOMEM", pos: 3 },
  { nome: "Calças", slug: "calcas", seccao: "HOMEM", pos: 4 },

  { nome: "Vestidos de Gala", slug: "vestidos-gala", seccao: "MULHER", pos: 1 },
  { nome: "Alfaiataria", slug: "alfaiataria", seccao: "MULHER", pos: 2 },
  { nome: "Blusas", slug: "blusas", seccao: "MULHER", pos: 3 },
  { nome: "Casacos", slug: "casacos", seccao: "MULHER", pos: 4 },

  { nome: "Cerimónia", slug: "cerimonia", seccao: "CRIANCA", pos: 1 },
  { nome: "Casacos", slug: "casacos", seccao: "CRIANCA", pos: 2 },
  { nome: "Dia-a-dia", slug: "dia-a-dia", seccao: "CRIANCA", pos: 3 },
];

const PRODUTOS: DefProduto[] = [
  // ------------------------------- HOMEM -------------------------------
  {
    nome: "Fato Clássico Marfim",
    slug: "fato-classico-marfim",
    seccao: "HOMEM",
    categoria: "fatos",
    oferta: "AMBOS",
    descricao:
      "Fato de três peças em lã fria cor marfim, corte italiano e forro em cetim. Uma escolha certa para casamentos de dia e cerimónias ao ar livre. Pode levar para casa ou alugar só para o evento.",
    conservacao: "Limpeza a seco. Guardar em cabide largo dentro da capa.",
    marca: "Casa Vieira",
    imagem: "/img/homem-fato-marfim.svg",
    precoVenda: 189000,
    precoAntigo: 215000,
    precoDia: 25000,
    precoFimDeSemana: 55000,
    caucao: 80000,
    provaObrigatoria: true,
    destaque: true,
    variantes: [
      { tamanho: "46", cor: "Marfim", stockVenda: 2, stockAluguer: 1 },
      { tamanho: "48", cor: "Marfim", stockVenda: 3, stockAluguer: 1 },
      { tamanho: "50", cor: "Marfim", stockVenda: 2, stockAluguer: 1 },
      { tamanho: "52", cor: "Marfim", stockVenda: 1, stockAluguer: 1 },
    ],
  },
  {
    nome: "Smoking Preto de Gala",
    slug: "smoking-preto-gala",
    seccao: "HOMEM",
    categoria: "fatos",
    oferta: "ALUGUER",
    descricao:
      "Smoking preto com lapela em cetim e calça de risca lateral. Peça de coleção do ateliê, disponível apenas para aluguer, com prova obrigatória para acerto de bainha e cintura.",
    conservacao: "A higienização é feita pelo ateliê depois de cada aluguer.",
    imagem: "/img/homem-smoking-preto.svg",
    precoDia: 32000,
    precoFimDeSemana: 68000,
    caucao: 120000,
    provaObrigatoria: true,
    destaque: true,
    diasHigienizacao: 3,
    variantes: [
      { tamanho: "48", cor: "Preto", stockAluguer: 1 },
      { tamanho: "50", cor: "Preto", stockAluguer: 1 },
      { tamanho: "52", cor: "Preto", stockAluguer: 1 },
    ],
  },
  {
    nome: "Camisa de Linho",
    slug: "camisa-linho-branca",
    seccao: "HOMEM",
    categoria: "camisas",
    oferta: "VENDA",
    descricao:
      "Camisa em linho puro, respirável e fresca, pensada para o calor de Luanda. Colarinho macio e corte regular.",
    conservacao: "Lavar a 30°C. Passar ainda húmida.",
    imagem: "/img/homem-camisa-linho.svg",
    precoVenda: 24500,
    variantes: [
      { tamanho: "S", cor: "Branco", stockVenda: 6 },
      { tamanho: "M", cor: "Branco", stockVenda: 8 },
      { tamanho: "L", cor: "Branco", stockVenda: 7 },
      { tamanho: "XL", cor: "Azul claro", stockVenda: 4 },
    ],
  },
  {
    nome: "Trench Coat Areia",
    slug: "trench-coat-areia",
    seccao: "HOMEM",
    categoria: "casacos",
    oferta: "AMBOS",
    descricao:
      "Trench coat em gabardine com cinto e ombreiras suaves. Serve de casaco de viagem e de peça de cerimónia informal.",
    imagem: "/img/homem-trench-areia.svg",
    precoVenda: 98000,
    precoDia: 15000,
    caucao: 45000,
    variantes: [
      { tamanho: "M", cor: "Areia", stockVenda: 2, stockAluguer: 1 },
      { tamanho: "L", cor: "Areia", stockVenda: 2, stockAluguer: 1 },
    ],
  },
  {
    nome: "Calças Chino",
    slug: "calcas-chino-caqui",
    seccao: "HOMEM",
    categoria: "calcas",
    oferta: "VENDA",
    descricao: "Calças chino em algodão com leve elasticidade, corte direito.",
    imagem: "/img/homem-chino-caqui.svg",
    precoVenda: 29000,
    variantes: [
      { tamanho: "40", cor: "Caqui", stockVenda: 5 },
      { tamanho: "42", cor: "Caqui", stockVenda: 6 },
      { tamanho: "44", cor: "Azul-marinho", stockVenda: 4 },
    ],
  },
  {
    nome: "Fato Índigo",
    slug: "fato-indigo",
    seccao: "HOMEM",
    categoria: "fatos",
    oferta: "AMBOS",
    descricao:
      "Fato de dois botões em tom índigo profundo. Versátil: veste bem num casamento e num dia de trabalho.",
    imagem: "/img/homem-fato-indigo.svg",
    precoVenda: 165000,
    precoDia: 22000,
    precoFimDeSemana: 48000,
    caucao: 70000,
    provaObrigatoria: true,
    variantes: [
      { tamanho: "48", cor: "Índigo", stockVenda: 2, stockAluguer: 1 },
      { tamanho: "50", cor: "Índigo", stockVenda: 2, stockAluguer: 1 },
    ],
  },

  // ------------------------------- MULHER ------------------------------
  {
    nome: "Vestido de Gala Bordeaux",
    slug: "vestido-gala-bordeaux",
    seccao: "MULHER",
    categoria: "vestidos-gala",
    oferta: "ALUGUER",
    descricao:
      "Vestido longo em crepe bordeaux com drapeado na cintura e abertura lateral discreta. Peça única do ateliê, só para aluguer. A prova é obrigatória — ajustamos o comprimento ao seu sapato.",
    conservacao: "Higienização incluída no serviço de aluguer.",
    imagem: "/img/mulher-vestido-bordeaux.svg",
    precoDia: 35000,
    precoFimDeSemana: 75000,
    caucao: 130000,
    provaObrigatoria: true,
    destaque: true,
    diasHigienizacao: 3,
    minDias: 2,
    variantes: [
      { tamanho: "36", cor: "Bordeaux", stockAluguer: 1 },
      { tamanho: "38", cor: "Bordeaux", stockAluguer: 1 },
      { tamanho: "40", cor: "Bordeaux", stockAluguer: 1 },
    ],
  },
  {
    nome: "Vestido de Cerimónia Dourado",
    slug: "vestido-cerimonia-dourado",
    seccao: "MULHER",
    categoria: "vestidos-gala",
    oferta: "ALUGUER",
    descricao:
      "Vestido de cerimónia com trabalho de missangas douradas feito à mão no ateliê. Brilha muito bem em luz de noite.",
    imagem: "/img/mulher-vestido-dourado.svg",
    precoDia: 42000,
    precoFimDeSemana: 88000,
    caucao: 150000,
    provaObrigatoria: true,
    destaque: true,
    diasHigienizacao: 4,
    minDias: 2,
    variantes: [
      { tamanho: "38", cor: "Dourado", stockAluguer: 1 },
      { tamanho: "40", cor: "Dourado", stockAluguer: 1 },
    ],
  },
  {
    nome: "Blazer de Alfaiataria",
    slug: "blazer-alfaiataria-preto",
    seccao: "MULHER",
    categoria: "alfaiataria",
    oferta: "AMBOS",
    descricao:
      "Blazer estruturado de ombro suave, forrado. Fecha o visual de trabalho e serve de peça de cerimónia com calça a condizer.",
    imagem: "/img/mulher-blazer-preto.svg",
    precoVenda: 87000,
    precoDia: 14000,
    caucao: 40000,
    variantes: [
      { tamanho: "36", cor: "Preto", stockVenda: 3, stockAluguer: 1 },
      { tamanho: "38", cor: "Preto", stockVenda: 4, stockAluguer: 1 },
      { tamanho: "42", cor: "Preto", stockVenda: 2 },
    ],
  },
  {
    nome: "Blusa de Seda",
    slug: "blusa-seda-marfim",
    seccao: "MULHER",
    categoria: "blusas",
    oferta: "VENDA",
    descricao: "Blusa em seda lavada, caimento fluido e brilho discreto.",
    conservacao: "Lavar à mão em água fria ou limpeza a seco.",
    imagem: "/img/mulher-blusa-seda.svg",
    precoVenda: 38000,
    precoAntigo: 45000,
    variantes: [
      { tamanho: "S", cor: "Marfim", stockVenda: 5 },
      { tamanho: "M", cor: "Marfim", stockVenda: 6 },
      { tamanho: "L", cor: "Verde-água", stockVenda: 3 },
    ],
  },
  {
    nome: "Conjunto em Tecido Wax",
    slug: "conjunto-wax",
    seccao: "MULHER",
    categoria: "alfaiataria",
    oferta: "VENDA",
    descricao:
      "Conjunto de top e saia em wax de algodão, padrão desenhado e cortado no ateliê. Cada peça tem uma combinação de padrão ligeiramente diferente.",
    imagem: "/img/mulher-conjunto-wax.svg",
    precoVenda: 65000,
    destaque: true,
    variantes: [
      { tamanho: "S", cor: "Terracota", stockVenda: 4 },
      { tamanho: "M", cor: "Terracota", stockVenda: 5 },
      { tamanho: "L", cor: "Terracota", stockVenda: 3 },
    ],
  },
  {
    nome: "Casaco de Lã Camel",
    slug: "casaco-la-camel",
    seccao: "MULHER",
    categoria: "casacos",
    oferta: "AMBOS",
    descricao: "Casaco comprido em mistura de lã, para viagens a climas frios.",
    imagem: "/img/mulher-casaco-camel.svg",
    precoVenda: 112000,
    precoDia: 18000,
    caucao: 50000,
    variantes: [
      { tamanho: "38", cor: "Camel", stockVenda: 2, stockAluguer: 1 },
      { tamanho: "40", cor: "Camel", stockVenda: 1, stockAluguer: 1 },
    ],
  },

  // ------------------------------ CRIANÇA ------------------------------
  {
    nome: "Fatinho de Cerimónia",
    slug: "fatinho-cerimonia-azul",
    seccao: "CRIANCA",
    categoria: "cerimonia",
    oferta: "AMBOS",
    descricao:
      "Fato de menino com colete e laço, em azul. Cresce depressa? Alugue só para o dia da festa.",
    imagem: "/img/crianca-fato-azul.svg",
    precoVenda: 52000,
    precoDia: 12000,
    precoFimDeSemana: 25000,
    caucao: 30000,
    provaObrigatoria: true,
    destaque: true,
    variantes: [
      { tamanho: "4 anos", cor: "Azul", stockVenda: 2, stockAluguer: 1 },
      { tamanho: "6 anos", cor: "Azul", stockVenda: 3, stockAluguer: 1 },
      { tamanho: "8 anos", cor: "Azul", stockVenda: 2, stockAluguer: 1 },
      { tamanho: "10 anos", cor: "Azul", stockVenda: 2, stockAluguer: 1 },
    ],
  },
  {
    nome: "Vestido de Dama de Honor",
    slug: "vestido-dama-honor",
    seccao: "CRIANCA",
    categoria: "cerimonia",
    oferta: "ALUGUER",
    descricao:
      "Vestido em tule com faixa de cetim, feito para as meninas do cortejo. Só para aluguer, com prova para ajustar a faixa.",
    imagem: "/img/crianca-vestido-dama.svg",
    precoDia: 14000,
    precoFimDeSemana: 30000,
    caucao: 35000,
    provaObrigatoria: true,
    diasHigienizacao: 3,
    variantes: [
      { tamanho: "4 anos", cor: "Marfim", stockAluguer: 1 },
      { tamanho: "6 anos", cor: "Marfim", stockAluguer: 1 },
      { tamanho: "8 anos", cor: "Marfim", stockAluguer: 1 },
    ],
  },
  {
    nome: "Casaco Impermeável Infantil",
    slug: "casaco-impermeavel-infantil",
    seccao: "CRIANCA",
    categoria: "casacos",
    oferta: "VENDA",
    descricao: "Casaco leve com capuz para a época das chuvas.",
    imagem: "/img/crianca-casaco-chuva.svg",
    precoVenda: 27000,
    variantes: [
      { tamanho: "4 anos", cor: "Verde", stockVenda: 5 },
      { tamanho: "6 anos", cor: "Verde", stockVenda: 6 },
      { tamanho: "8 anos", cor: "Verde", stockVenda: 4 },
    ],
  },
  {
    nome: "Conjunto Desportivo",
    slug: "conjunto-desportivo-infantil",
    seccao: "CRIANCA",
    categoria: "dia-a-dia",
    oferta: "VENDA",
    descricao: "Camisola e calças em algodão macio, para o dia-a-dia e a escola.",
    imagem: "/img/crianca-conjunto-desporto.svg",
    precoVenda: 19500,
    variantes: [
      { tamanho: "4 anos", cor: "Azul-marinho", stockVenda: 7 },
      { tamanho: "6 anos", cor: "Azul-marinho", stockVenda: 8 },
      { tamanho: "8 anos", cor: "Cinzento", stockVenda: 5 },
    ],
  },
];

// ------------------------------------------------------------------ run

export type OpcoesDaSemente = {
  /**
   * "demonstracao": contas com as palavras-passe do README (base local).
   * "publica": base real acessível na Internet — as contas de demonstração
   * ficam com palavras-passe aleatórias (ninguém entra com elas) e o
   * administrador usa o e-mail da loja com a palavra-passe indicada.
   */
  modo?: "demonstracao" | "publica";
  senhaAdministrador?: string;
};

export async function semear(
  db: BaseDeDados,
  avisar: (m: string) => void = console.log,
  opcoes: OpcoesDaSemente = {}
) {
  const publica = opcoes.modo === "publica";
  contadorDeIds = 0;
  avisar("A limpar as tabelas...");
  await db.execute(sql`
    TRUNCATE TABLE
      order_events, payments, rental_reservations, appointments,
      order_items, orders, product_images, product_variants,
      products, categories, users, settings
    RESTART IDENTITY CASCADE
  `);

  // ---------------------------------------------------------- definições
  avisar("Definições da loja...");
  await db.insert(settings).values({
    id: "default",
    storeName: "DDRESS",
    tagline: "Aluguer e venda de vestidos",
    phone: "+244 923 000 111",
    whatsapp: "+244 923 000 111",
    email: "atendimentoddress@gmail.com",
    address: "Rua Amílcar Cabral, 120 — Ingombota, Luanda",
    bankName: "Banco BAI",
    accountHolder: "DDRESS — Aluguer e Venda de Vestidos, Lda.",
    iban: "AO06 0040 0000 1234 5678 9012 3",
    multicaixaNumber: "+244 923 000 111",
    deliveryFee: 2500,
    openDays: [1, 2, 3, 4, 5, 6],
    openHour: "09:00",
    closeHour: "18:00",
    slotMinutes: 45,
    slotCapacity: 2,
    minNoticeHours: 24,
    bookingHorizonDays: 45,
    closedDates: [],
  });

  // ------------------------------------------------------------ pessoas
  avisar("Contas de acesso...");
  const aleatoria = () => crypto.randomUUID() + crypto.randomUUID();
  const hash = (p: string) => bcrypt.hashSync(publica ? aleatoria() : p, 10);
  const hashAdministrador = bcrypt.hashSync(publica ? (opcoes.senhaAdministrador ?? aleatoria()) : "admin123", 10);

  const adminId = uid();
  const funcionarioId = uid();
  const funcionaria2Id = uid();
  const suporteId = uid();
  const contabilistaId = uid();
  const motoristaId = uid();
  const clienteId = uid();
  const cliente2Id = uid();

  await db.insert(users).values([
    {
      id: adminId,
      name: "Administrador DDRESS",
      email: publica ? "atendimentoddress@gmail.com" : "admin@ddress.ao",
      phone: "+244 923 000 111",
      passwordHash: hashAdministrador,
      role: "ADMIN",
    },
    {
      id: funcionarioId,
      name: "Domingos Cardoso",
      email: "domingos@ddress.ao",
      phone: "+244 923 000 222",
      passwordHash: hash("funcionario123"),
      role: "FUNCIONARIO",
    },
    {
      id: funcionaria2Id,
      name: "Ana Bengui",
      email: "ana@ddress.ao",
      phone: "+244 923 000 333",
      passwordHash: hash("funcionario123"),
      role: "FUNCIONARIO",
    },
    {
      id: suporteId,
      name: "Hélder Kiala",
      email: "suporte@ddress.ao",
      phone: "+244 923 000 444",
      passwordHash: hash("suporte123"),
      role: "SUPORTE",
    },
    {
      id: contabilistaId,
      name: "Marta Sebastião",
      email: "contabilidade@ddress.ao",
      phone: "+244 923 000 555",
      passwordHash: hash("conta123"),
      role: "CONTABILISTA",
    },
    {
      id: motoristaId,
      name: "Alberto Quissanga",
      email: "motorista@ddress.ao",
      phone: "+244 923 000 666",
      passwordHash: hash("motorista123"),
      role: "MOTORISTA",
    },
    {
      id: clienteId,
      name: "Joana Miguel",
      email: "cliente@exemplo.ao",
      phone: "+244 924 111 222",
      address: "Talatona, Luanda",
      passwordHash: hash("cliente123"),
      role: "CLIENTE",
    },
    {
      id: cliente2Id,
      name: "Paulo Neto",
      email: "paulo@exemplo.ao",
      phone: "+244 925 333 444",
      address: "Maianga, Luanda",
      passwordHash: hash("cliente123"),
      role: "CLIENTE",
    },
  ]);

  // ---------------------------------------------------------- categorias
  avisar("Categorias e produtos...");
  const catIds = new Map<string, string>();
  const catRows = CATEGORIAS.map((c) => {
    const id = uid();
    catIds.set(`${c.seccao}:${c.slug}`, id);
    return { id, name: c.nome, slug: c.slug, section: c.seccao, position: c.pos };
  });
  await db.insert(categories).values(catRows);

  // ------------------------------------------------------------ produtos
  const varianteIds = new Map<string, string>(); // "slug|tamanho" -> id

  for (const p of PRODUTOS) {
    const produtoId = uid();
    const categoryId = catIds.get(`${p.seccao}:${p.categoria}`)!;

    await db.insert(products).values({
      id: produtoId,
      name: p.nome,
      slug: p.slug,
      description: p.descricao,
      care: p.conservacao ?? null,
      brand: p.marca ?? null,
      section: p.seccao,
      categoryId,
      offer: p.oferta,
      salePrice: p.precoVenda ?? null,
      compareAtPrice: p.precoAntigo ?? null,
      rentalDayPrice: p.precoDia ?? null,
      rentalWeekendPrice: p.precoFimDeSemana ?? null,
      rentalDeposit: p.caucao ?? null,
      minRentalDays: p.minDias ?? 1,
      maxRentalDays: 14,
      cleaningBufferDays: p.diasHigienizacao ?? 2,
      requiresFitting: p.provaObrigatoria ?? false,
      featured: p.destaque ?? false,
      active: true,
    });

    await db.insert(productImages).values({
      id: uid(),
      productId: produtoId,
      url: p.imagem,
      alt: p.nome,
      position: 0,
    });

    let n = 1;
    for (const v of p.variantes) {
      const variantId = uid();
      varianteIds.set(`${p.slug}|${v.tamanho}`, variantId);
      await db.insert(productVariants).values({
        id: variantId,
        productId: produtoId,
        sku: `${p.slug.toUpperCase().replace(/-/g, "").slice(0, 10)}-${String(n).padStart(2, "0")}`,
        size: v.tamanho,
        color: v.cor,
        saleStock: v.stockVenda ?? 0,
        rentalStock: v.stockAluguer ?? 0,
      });
      n++;
    }
  }

  // --------------------------------------------- histórico (6 meses)
  avisar("Histórico de vendas e alugueres dos últimos meses...");
  const anoAtual = new Date().getFullYear();
  const historico = await semearHistorico(db, varianteIds, [funcionarioId, funcionaria2Id]);
  const numeroDemo = (n: number) =>
    `DDR-${anoAtual}-${String((historico.porAno.get(anoAtual) ?? 0) + n).padStart(4, "0")}`;

  // ------------------------------------------------- pedidos de exemplo
  avisar("Pedidos e marcações de demonstração...");

  // --- Pedido 1: aluguer de vestido, à espera de prova ---
  const pedido1 = uid();
  const item1 = uid();
  const variante1 = varianteIds.get("vestido-gala-bordeaux|38")!;
  const inicio1 = proximaSexta(9);
  const fim1 = somaDias(inicio1, 2);

  await db.insert(orders).values({
    id: pedido1,
    number: numeroDemo(1),
    userId: clienteId,
    customerName: "Joana Miguel",
    customerPhone: "+244 924 111 222",
    customerEmail: "cliente@exemplo.ao",
    customerAddress: "Talatona, Luanda",
    status: "AGUARDA_PROVA",
    paymentMethod: "MULTICAIXA_EXPRESS",
    paymentStatus: "PENDENTE",
    subtotal: 75000,
    depositTotal: 130000,
    deliveryFee: 0,
    total: 205000,
    needsFitting: true,
    customerNote: "É para um casamento no sábado à noite.",
    assignedToId: funcionarioId,
  });

  await db.insert(orderItems).values({
    id: item1,
    orderId: pedido1,
    productId: (await produtoIdPorSlug(db, "vestido-gala-bordeaux"))!,
    variantId: variante1,
    productName: "Vestido de Gala Bordeaux",
    variantLabel: "Tamanho 38 · Bordeaux",
    imageUrl: "/img/mulher-vestido-bordeaux.svg",
    kind: "ALUGUER",
    quantity: 1,
    unitPrice: 75000,
    deposit: 130000,
    lineTotal: 75000,
    startDate: inicio1,
    endDate: fim1,
    days: 3,
  });

  await db.insert(rentalReservations).values({
    id: uid(),
    variantId: variante1,
    orderId: pedido1,
    orderItemId: item1,
    startDate: inicio1,
    endDate: fim1,
    blockUntil: somaDias(fim1, 3),
    status: "CONFIRMADA",
    note: "Reserva criada no site.",
  });

  await db.insert(orderEvents).values([
    {
      id: uid(),
      orderId: pedido1,
      type: "CRIADO",
      message: "Pedido criado pelo cliente no site.",
    },
    {
      id: uid(),
      orderId: pedido1,
      type: "ATRIBUIDO",
      message: "Pedido recebido por Domingos Cardoso.",
      actorId: funcionarioId,
    },
    {
      id: uid(),
      orderId: pedido1,
      type: "PROVA",
      message: "Prova marcada no ateliê.",
      actorId: funcionarioId,
    },
  ]);

  await db.insert(appointments).values({
    id: uid(),
    code: `PRV-${anoAtual}-0001`,
    userId: clienteId,
    customerName: "Joana Miguel",
    customerPhone: "+244 924 111 222",
    customerEmail: "cliente@exemplo.ao",
    productId: await produtoIdPorSlug(db, "vestido-gala-bordeaux"),
    variantId: variante1,
    orderId: pedido1,
    date: proximoDiaUtil(2),
    startTime: "10:00",
    endTime: "10:45",
    status: "CONFIRMADA",
    notes: "Vou levar os sapatos para acertar o comprimento.",
    staffId: funcionarioId,
  });

  // --- Pedido 2: venda simples, à espera de validação do comprovativo ---
  const pedido2 = uid();
  const variante2 = varianteIds.get("camisa-linho-branca|M")!;
  const variante3 = varianteIds.get("calcas-chino-caqui|42")!;

  await db.insert(orders).values({
    id: pedido2,
    number: numeroDemo(2),
    userId: cliente2Id,
    customerName: "Paulo Neto",
    customerPhone: "+244 925 333 444",
    customerEmail: "paulo@exemplo.ao",
    customerAddress: "Rua da Missão, Maianga, Luanda",
    status: "NOVO",
    paymentMethod: "TRANSFERENCIA",
    paymentStatus: "EM_VERIFICACAO",
    subtotal: 53500,
    depositTotal: 0,
    deliveryFee: 2500,
    total: 56000,
    needsFitting: false,
    customerNote: "Entregar depois das 17h, por favor.",
  });

  await db.insert(orderItems).values([
    {
      id: uid(),
      orderId: pedido2,
      productId: (await produtoIdPorSlug(db, "camisa-linho-branca"))!,
      variantId: variante2,
      productName: "Camisa de Linho",
      variantLabel: "Tamanho M · Branco",
      imageUrl: "/img/homem-camisa-linho.svg",
      kind: "VENDA",
      quantity: 1,
      unitPrice: 24500,
      deposit: 0,
      lineTotal: 24500,
    },
    {
      id: uid(),
      orderId: pedido2,
      productId: (await produtoIdPorSlug(db, "calcas-chino-caqui"))!,
      variantId: variante3,
      productName: "Calças Chino",
      variantLabel: "Tamanho 42 · Caqui",
      imageUrl: "/img/homem-chino-caqui.svg",
      kind: "VENDA",
      quantity: 1,
      unitPrice: 29000,
      deposit: 0,
      lineTotal: 29000,
    },
  ]);

  await db.insert(payments).values({
    id: uid(),
    orderId: pedido2,
    method: "TRANSFERENCIA",
    amount: 56000,
    reference: "TRF 998211",
    status: "EM_VERIFICACAO",
  });

  await db.insert(orderEvents).values([
    { id: uid(), orderId: pedido2, type: "CRIADO", message: "Pedido criado pelo cliente no site." },
    {
      id: uid(),
      orderId: pedido2,
      type: "PAGAMENTO",
      message: "Cliente indicou a referência da transferência: TRF 998211.",
    },
  ]);

  // --- Peça ocupada: smoking 50 alugado neste momento -------------------
  const smoking50 = varianteIds.get("smoking-preto-gala|50")!;
  await db.insert(rentalReservations).values({
    id: uid(),
    variantId: smoking50,
    startDate: dia(-1),
    endDate: dia(4),
    blockUntil: dia(7),
    status: "ENTREGUE",
    note: "Aluguer registado na loja (balcão).",
  });

  // --- Pedido 3: venda pronta, à espera do motorista --------------------
  const pedido3 = uid();
  const camisaG = varianteIds.get("camisa-linho-branca|L")!;

  await db.insert(orders).values({
    id: pedido3,
    number: numeroDemo(3),
    customerName: "Aurora Capemba",
    customerPhone: "+244 928 444 100",
    customerEmail: "aurora@exemplo.ao",
    customerAddress: "Condomínio Jardins do Éden, casa 14 — Talatona, Luanda",
    status: "PRONTO",
    paymentMethod: "NA_ENTREGA",
    paymentStatus: "PENDENTE",
    subtotal: 24500,
    depositTotal: 0,
    deliveryFee: 2500,
    total: 27000,
    needsFitting: false,
    customerResidence: "LUANDA",
    assignedToId: funcionaria2Id,
  });

  await db.insert(orderItems).values({
    id: uid(),
    orderId: pedido3,
    productId: (await produtoIdPorSlug(db, "camisa-linho-branca"))!,
    variantId: camisaG,
    productName: "Camisa de Linho",
    variantLabel: "Tamanho L · Branco",
    imageUrl: "/img/homem-camisa-linho.svg",
    kind: "VENDA",
    quantity: 1,
    unitPrice: 24500,
    deposit: 0,
    lineTotal: 24500,
  });

  await db.insert(orderEvents).values([
    { id: uid(), orderId: pedido3, type: "CRIADO", message: "Pedido criado no site com 1 peça(s)." },
    {
      id: uid(),
      orderId: pedido3,
      type: "ESTADO",
      message: 'Estado alterado para "Pronto para entrega" por Ana Bengui.',
      actorId: funcionaria2Id,
    },
  ]);

  // --- Pedido 4: aluguer a decorrer, peça a recolher hoje ---------------
  const pedido4 = uid();
  const item4 = uid();
  const smoking52 = varianteIds.get("smoking-preto-gala|52")!;

  await db.insert(orders).values({
    id: pedido4,
    number: numeroDemo(4),
    customerName: "Nelson Tchipa",
    customerPhone: "+244 929 777 300",
    customerEmail: "nelson@exemplo.ao",
    customerAddress: "Rua da Samba, 45 — Samba, Luanda",
    status: "EM_ALUGUER",
    paymentMethod: "MULTICAIXA_EXPRESS",
    paymentStatus: "PAGO",
    subtotal: 96000,
    depositTotal: 120000,
    deliveryFee: 2500,
    total: 218500,
    needsFitting: true,
    customerResidence: "LUANDA",
    assignedToId: funcionarioId,
  });

  await db.insert(orderItems).values({
    id: item4,
    orderId: pedido4,
    productId: (await produtoIdPorSlug(db, "smoking-preto-gala"))!,
    variantId: smoking52,
    productName: "Smoking Preto de Gala",
    variantLabel: "Tamanho 52 · Preto",
    imageUrl: "/img/homem-smoking-preto.svg",
    kind: "ALUGUER",
    quantity: 1,
    unitPrice: 96000,
    deposit: 120000,
    lineTotal: 96000,
    startDate: dia(-3),
    endDate: dia(0),
    days: 4,
  });

  await db.insert(rentalReservations).values({
    id: uid(),
    variantId: smoking52,
    orderId: pedido4,
    orderItemId: item4,
    startDate: dia(-3),
    endDate: dia(0),
    blockUntil: dia(3),
    status: "ENTREGUE",
    note: `Reserva do pedido ${numeroDemo(4)}.`,
  });

  await db.insert(payments).values({
    id: uid(),
    orderId: pedido4,
    method: "MULTICAIXA_EXPRESS",
    amount: 218500,
    reference: "MCX 771402",
    status: "PAGO",
    confirmedById: funcionarioId,
    confirmedAt: new Date(),
  });

  await db.insert(orderEvents).values([
    { id: uid(), orderId: pedido4, type: "CRIADO", message: "Pedido criado no site com 1 peça(s)." },
    {
      id: uid(),
      orderId: pedido4,
      type: "PAGAMENTO",
      message: "Pagamento confirmado: 218.500 Kz, por Domingos Cardoso.",
      actorId: funcionarioId,
    },
    {
      id: uid(),
      orderId: pedido4,
      type: "ENTREGA",
      message: "Entrega registada por Alberto Quissanga — peça em aluguer com o cliente.",
      actorId: motoristaId,
    },
  ]);

  // --- Peça já devolvida, à espera da higienização ---------------------
  const fatinho6 = varianteIds.get("fatinho-cerimonia-azul|6 anos")!;
  await db.insert(rentalReservations).values({
    id: uid(),
    variantId: fatinho6,
    startDate: dia(-9),
    endDate: dia(-2),
    returnedAt: dia(-1),
    blockUntil: dia(2),
    status: "EM_HIGIENIZACAO",
    note: "Aluguer de balcão — batizado.",
    cleaningNote: "Foi à lavandaria; volta na quarta.",
  });

  // --- Marcação avulsa, ainda por confirmar ---------------------------
  await db.insert(appointments).values({
    id: uid(),
    code: `PRV-${anoAtual}-0002`,
    customerName: "Elsa Kiala",
    customerPhone: "+244 926 777 888",
    customerEmail: "elsa@exemplo.ao",
    productId: await produtoIdPorSlug(db, "vestido-cerimonia-dourado"),
    variantId: varianteIds.get("vestido-cerimonia-dourado|40")!,
    date: proximoDiaUtil(3),
    startTime: "15:00",
    endTime: "15:45",
    status: "PENDENTE",
    notes: "Primeira vez no ateliê.",
  });

  const [{ count: totalProdutos }] = (await db.execute(
    sql`SELECT COUNT(*)::int AS count FROM products`
  )).rows as { count: number }[];

  avisar("");
  avisar("  Pronto.");
  avisar(`  ${totalProdutos} produtos, ${varianteIds.size} peças, ${historico.total} pedidos de histórico, 4 pedidos em curso, 2 marcações.`);
  avisar("");
  if (publica) {
    avisar("  Administrador: atendimentoddress@gmail.com (palavra-passe definida em DDRESS_SENHA_ADMIN).");
  } else {
    avisar("  Contas de acesso:");
    avisar("    Administrador   admin@ddress.ao       admin123");
    avisar("    Funcionário     domingos@ddress.ao    funcionario123");
    avisar("    Funcionária     ana@ddress.ao             funcionario123");
    avisar("    Suporte         suporte@ddress.ao         suporte123");
    avisar("    Contabilista    contabilidade@ddress.ao   conta123");
    avisar("    Motorista       motorista@ddress.ao       motorista123");
    avisar("    Cliente         cliente@exemplo.ao        cliente123");
  }
  avisar("");
}

// ------------------------------------------------------------ histórico

const CLIENTES_FICTICIOS = [
  ["Ana Paula Domingos", "Talatona"],
  ["Bruno Sebastião", "Kilamba"],
  ["Carla Mendes", "Maianga"],
  ["Délcio Francisco", "Viana"],
  ["Edna Quintas", "Alvalade"],
  ["Fábio Neto", "Benfica"],
  ["Graça Lopes", "Ingombota"],
  ["Hélder Cassoma", "Cazenga"],
  ["Irina Tavares", "Miramar"],
  ["João Baptista", "Samba"],
  ["Kátia Rodrigues", "Talatona"],
  ["Lukeny Manuel", "Zango"],
  ["Mariana Costa", "Maianga"],
  ["Nelson Kiala", "Morro Bento"],
  ["Olga Fernandes", "Alvalade"],
  ["Paulo Dias", "Kilamba"],
  ["Rosa Chipenda", "Viana"],
  ["Sílvio André", "Ingombota"],
] as const;

/** Gerador pseudo-aleatório com semente fixa: o histórico é sempre igual */
function aleatorio(semente: number) {
  let a = semente;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pedidos já fechados nos últimos seis meses, para o painel e os relatórios
 * terem movimento. Todos os clientes são fictícios. Não mexe no stock nem
 * bloqueia peças: são vendas entregues e alugueres devolvidos.
 */
async function semearHistorico(
  db: BaseDeDados,
  varianteIds: Map<string, string>,
  funcionarios: string[]
): Promise<{ total: number; porAno: Map<number, number> }> {
  const rnd = aleatorio(2026);
  const escolher = <T,>(lista: readonly T[]) => lista[Math.floor(rnd() * lista.length)];
  const hoje = dia(0);
  const limite = somaDias(hoje, -12);
  const POR_MES = [6, 7, 9, 8, 11, 12];

  type Plano = { criado: Date; produto: DefProduto; tipo: "VENDA" | "ALUGUER" };
  const planos: Plano[] = [];

  for (let m = 5; m >= 0; m--) {
    const inicioMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - m, 1));
    for (let i = 0; i < POR_MES[5 - m]; i++) {
      const criado = new Date(inicioMes);
      criado.setUTCDate(1 + Math.floor(rnd() * 27));
      criado.setUTCHours(8 + Math.floor(rnd() * 9), Math.floor(rnd() * 60));
      if (criado.getTime() > limite.getTime()) continue;
      const produto = escolher(PRODUTOS);
      const tipo: "VENDA" | "ALUGUER" =
        produto.oferta === "AMBOS"
          ? rnd() < 0.55
            ? "ALUGUER"
            : "VENDA"
          : produto.oferta === "ALUGUER"
            ? "ALUGUER"
            : "VENDA";
      planos.push({ criado, produto, tipo });
    }
  }
  planos.sort((a, b) => a.criado.getTime() - b.criado.getTime());

  const porAno = new Map<number, number>();
  const metodos = ["MULTICAIXA_EXPRESS", "TRANSFERENCIA", "NA_ENTREGA"] as const;

  for (const { criado, produto: p, tipo } of planos) {
    const ano = criado.getUTCFullYear();
    const n = (porAno.get(ano) ?? 0) + 1;
    porAno.set(ano, n);

    const variante =
      p.variantes.find((v) => (tipo === "VENDA" ? (v.stockVenda ?? 0) : (v.stockAluguer ?? 0)) > 0) ?? p.variantes[0];
    const variantId = varianteIds.get(`${p.slug}|${variante.tamanho}`)!;
    const produtoId = (await produtoIdPorSlug(db, p.slug))!;
    const [nome, bairro] = escolher(CLIENTES_FICTICIOS);
    const domicilio = rnd() < 0.4;
    const metodo = escolher(metodos);
    const pedidoId = uid();

    let preco = p.precoVenda ?? 0;
    let caucao = 0;
    let inicio: Date | null = null;
    let fim: Date | null = null;
    let dias: number | null = null;

    if (tipo === "ALUGUER") {
      dias = 2 + Math.floor(rnd() * 3);
      const diaDoPedido = new Date(Date.UTC(criado.getUTCFullYear(), criado.getUTCMonth(), criado.getUTCDate()));
      inicio = somaDias(diaDoPedido, 4 + Math.floor(rnd() * 5));
      fim = somaDias(inicio, dias - 1);
      preco = (p.precoDia ?? 0) * dias;
      if (p.precoFimDeSemana && inicio.getUTCDay() === 5 && p.precoFimDeSemana < preco) preco = p.precoFimDeSemana;
      caucao = p.caucao ?? 0;
    }

    const entrega = domicilio ? 2500 : 0;
    const total = preco + caucao + entrega;
    const telefone = `+244 9${20 + Math.floor(rnd() * 79)} ${100 + Math.floor(rnd() * 900)} ${100 + Math.floor(rnd() * 900)}`;

    await db.insert(orders).values({
      id: pedidoId,
      number: `DDR-${ano}-${String(n).padStart(4, "0")}`,
      customerName: nome,
      customerPhone: telefone,
      customerAddress: domicilio ? `${bairro}, Luanda` : null,
      status: "CONCLUIDO",
      paymentMethod: metodo,
      paymentStatus: "PAGO",
      subtotal: preco,
      depositTotal: caucao,
      deliveryFee: entrega,
      total,
      needsFitting: tipo === "ALUGUER" && !!p.provaObrigatoria,
      assignedToId: escolher(funcionarios),
      createdAt: criado,
      updatedAt: fim ?? criado,
    });

    const itemId = uid();
    await db.insert(orderItems).values({
      id: itemId,
      orderId: pedidoId,
      productId: produtoId,
      variantId,
      productName: p.nome,
      variantLabel: `Tamanho ${variante.tamanho} · ${variante.cor}`,
      imageUrl: p.imagem,
      kind: tipo,
      quantity: 1,
      unitPrice: preco,
      deposit: caucao,
      lineTotal: preco,
      startDate: inicio,
      endDate: fim,
      days: dias,
    });

    if (tipo === "ALUGUER" && inicio && fim) {
      await db.insert(rentalReservations).values({
        variantId,
        orderId: pedidoId,
        orderItemId: itemId,
        startDate: inicio,
        endDate: fim,
        blockUntil: somaDias(fim, p.diasHigienizacao ?? 2),
        returnedAt: fim,
        status: "DEVOLVIDA",
        cleaningNote: "Higienização concluída.",
      });
    }

    await db.insert(payments).values({
      orderId: pedidoId,
      method: metodo,
      amount: total,
      status: "PAGO",
      confirmedById: funcionarios[0],
      confirmedAt: criado,
      createdAt: criado,
    });
    if (caucao > 0) {
      await db.insert(payments).values({
        orderId: pedidoId,
        method: metodo,
        amount: caucao,
        status: "REEMBOLSADO",
        isDepositRefund: true,
        confirmedById: funcionarios[0],
        confirmedAt: fim ?? criado,
        createdAt: fim ?? criado,
      });
    }

    await db.insert(orderEvents).values([
      { orderId: pedidoId, type: "CRIADO", message: "Pedido criado no site com 1 peça(s).", createdAt: criado },
      { orderId: pedidoId, type: "ESTADO", message: "Estado alterado para “Concluído”.", createdAt: fim ?? criado },
    ]);
  }

  return { total: planos.length, porAno };
}

/** Devolve o id do produto a partir do slug */
async function produtoIdPorSlug(db: BaseDeDados, slug: string): Promise<string | null> {
  const r = await db.execute(sql`SELECT id FROM products WHERE slug = ${slug} LIMIT 1`);
  const row = r.rows[0] as { id: string } | undefined;
  return row?.id ?? null;
}

/** Próximo dia em que o ateliê está aberto (segunda a sábado) */
function proximoDiaUtil(minimo: number): Date {
  const d = dia(minimo);
  while (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

