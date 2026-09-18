/**
 * A Joyce, assistente comercial da DDRESS.
 *
 * Não inventa: responde a partir do que a loja tem guardado (contactos,
 * morada, horário, taxa de entrega, regras do aluguer). Quando não sabe,
 * diz que não sabe e passa a conversa para uma pessoa, pelo WhatsApp.
 *
 * Este ficheiro é puro — serve o navegador e os testes.
 */

export type DadosDaLoja = {
  nomeDaLoja: string;
  telefone: string;
  whatsapp: string;
  email: string;
  morada: string;
  mapsUrl: string;
  horaAbertura: string;
  horaFecho: string;
  diasAbertos: number[];
  taxaDeEntrega: number;
  horasParaProva: number;
  assistente: string;
};

export type RespostaDaJoyce = {
  /** Chave do assunto, para testes e para medir o que mais perguntam */
  assunto: string;
  texto: string;
  /** Sugestões de páginas a abrir a seguir */
  ligacoes?: { texto: string; href: string }[];
  /** true quando a Joyce não soube responder */
  semResposta?: boolean;
};

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Sem acentos e em minúsculas, para comparar o que a pessoa escreveu */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Espaço fino que o formato de Angola usa nos milhares */
const ESPACO_ESTREITO = / /g;

function kz(valor: number): string {
  // Mesmo formato do resto do site, com espaço normal para caber no texto
  return `${new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(valor).replace(ESPACO_ESTREITO, " ")} Kz`;
}

function horario(d: DadosDaLoja): string {
  if (d.diasAbertos.length === 0) return "Diga-nos quando lhe der jeito e combinamos.";
  const ordenados = [...d.diasAbertos].sort((a, b) => a - b);
  const seguidos = ordenados.every((dia, i) => i === 0 || dia === ordenados[i - 1] + 1);
  const dias = seguidos
    ? `de ${DIAS[ordenados[0]]} a ${DIAS[ordenados[ordenados.length - 1]]}`
    : ordenados.map((dia) => DIAS[dia]).join(", ");
  return `Estamos abertas ${dias}, das ${d.horaAbertura} às ${d.horaFecho}`;
}

/** Assuntos que a Joyce conhece, por ordem de procura */
const ASSUNTOS: {
  chave: string;
  palavras: string[];
  resposta: (d: DadosDaLoja) => RespostaDaJoyce;
}[] = [
  {
    chave: "aluguer",
    palavras: ["alugar", "aluguer", "alugo", "rent", "emprestar", "quantos dias", "fim de semana", "fim-de-semana"],
    resposta: (d) => ({
      assunto: "aluguer",
      texto: `Alugamos por dia ou por fim-de-semana. Escolhe a peça, marca as datas no calendário dela e vê logo o valor e a caução. A caução é devolvida quando a peça volta em condições. ${
        d.horasParaProva ? `Se a peça precisar de prova, marque-a até ${d.horasParaProva} horas antes do levantamento, senão a reserva expira.` : ""
      }`,
      ligacoes: [
        { texto: "Peças para alugar", href: "/loja?tipo=aluguer" },
        { texto: "Como funciona", href: "/como-funciona" },
      ],
    }),
  },
  {
    chave: "prova",
    palavras: ["prova", "provar", "experimentar", "atelie", "ateliê", "marcar", "marcacao", "marcação", "hora"],
    resposta: (d) => ({
      assunto: "prova",
      texto: `Pode experimentar no ateliê com hora marcada — só lhe mostramos as horas em que a peça está cá à sua espera. ${horario(d)}.`,
      ligacoes: [
        { texto: "Marcar prova", href: "/marcacao" },
        { texto: "Ver as colecções", href: "/colecoes" },
      ],
    }),
  },
  {
    chave: "maquilhagem",
    palavras: ["maquilhagem", "maquiagem", "maquiadora", "make", "val", "penteado", "beleza"],
    resposta: () => ({
      assunto: "maquilhagem",
      texto:
        "Trabalhamos com a Val Makeup Antoluv. Diga-nos o dia, a hora e o local e nós tratamos do pedido consigo — a maquilhadora confirma depois directamente.",
      ligacoes: [{ texto: "Pedir maquilhagem", href: "/maquilhagem" }],
    }),
  },
  {
    chave: "sapatos",
    palavras: ["sapato", "sapatos", "salto", "sandalia", "sandália", "scarpin", "calcado", "calçado"],
    resposta: () => ({
      assunto: "sapatos",
      texto:
        "Também temos sapatos, para comprar ou alugar. Pode escolher os modelos que gosta na procura, ou dizer-nos o tamanho e o vestido que a loja sugere o par.",
      ligacoes: [{ texto: "Ver sapatos e pedir sugestão", href: "/maquilhagem#sapatos" }],
    }),
  },
  {
    chave: "entrega",
    palavras: ["entrega", "entregar", "recolha", "levar", "trazer", "receber em casa", "domicilio", "domicílio", "envio"],
    resposta: (d) => ({
      assunto: "entrega",
      texto: `Entregamos em Luanda por ${kz(d.taxaDeEntrega)} e a recolha depois do aluguer é por nossa conta. Também pode levantar no ateliê, sem custo.`,
      ligacoes: [{ texto: "Como funciona", href: "/como-funciona" }],
    }),
  },
  {
    chave: "pagamento",
    palavras: ["pagar", "pagamento", "multicaixa", "transferencia", "transferência", "iban", "express", "dinheiro", "caucao", "caução"],
    resposta: () => ({
      assunto: "pagamento",
      texto:
        "Pode pagar por Multicaixa Express, transferência bancária ou no ateliê, no acto da entrega. Nos alugueres há uma caução, devolvida depois de verificarmos a peça.",
      ligacoes: [{ texto: "Ver as peças", href: "/loja" }],
    }),
  },
  {
    chave: "tamanhos",
    palavras: ["tamanho", "tamanhos", "numero", "número", "medidas", "serve", "cintura", "ajuste", "ajustes"],
    resposta: () => ({
      assunto: "tamanhos",
      texto:
        "Cada peça mostra os tamanhos disponíveis e o calendário de cada um. Se estiver entre dois tamanhos, marque a prova: no ateliê fazemos pequenos ajustes.",
      ligacoes: [{ texto: "Marcar prova", href: "/marcacao" }],
    }),
  },
  {
    chave: "pedido",
    palavras: ["pedido", "encomenda", "acompanhar", "estado", "onde esta", "onde está", "ddr-", "reserva feita"],
    resposta: () => ({
      assunto: "pedido",
      texto: "Com o número do pedido (DDR-ANO-0000) e o telefone que usou, vê o estado a qualquer hora.",
      ligacoes: [
        { texto: "Acompanhar pedido", href: "/acompanhar" },
        { texto: "A minha conta", href: "/conta" },
      ],
    }),
  },
  {
    chave: "morada",
    palavras: ["onde", "morada", "endereco", "endereço", "localizacao", "localização", "loja fica", "chegar", "mapa"],
    resposta: (d) => ({
      assunto: "morada",
      texto: `Estamos em ${d.morada}. ${horario(d)}.`,
      ligacoes: [
        { texto: "Ver no mapa", href: d.mapsUrl || "/quem-somos" },
        { texto: "Quem somos", href: "/quem-somos" },
      ],
    }),
  },
  {
    chave: "horario",
    palavras: ["horario", "horário", "aberto", "abrem", "fecham", "funciona que horas", "domingo", "sabado", "sábado"],
    resposta: (d) => ({
      assunto: "horario",
      texto: `${horario(d)}. As provas são com hora marcada.`,
      ligacoes: [{ texto: "Marcar prova", href: "/marcacao" }],
    }),
  },
  {
    chave: "contacto",
    palavras: ["contacto", "telefone", "numero de telefone", "whatsapp", "ligar", "email", "e-mail", "falar"],
    resposta: (d) => ({
      assunto: "contacto",
      texto: `Ligue ou escreva para ${d.telefone}${d.email ? `, ou envie e-mail para ${d.email}` : ""}. Se preferir, continuamos esta conversa no WhatsApp.`,
    }),
  },
  {
    chave: "devolucao",
    palavras: ["devolver", "devolucao", "devolução", "estragar", "manchar", "lavar", "higienizacao", "higienização", "limpar"],
    resposta: () => ({
      assunto: "devolucao",
      texto:
        "A peça volta na data combinada e a lavagem é connosco — não precisa de a lavar. Depois de verificarmos, devolvemos a caução. Se houver um dano, falamos consigo antes de qualquer desconto.",
      ligacoes: [{ texto: "Como funciona", href: "/como-funciona" }],
    }),
  },
  {
    chave: "comprar",
    palavras: ["comprar", "venda", "vender", "preco", "preço", "quanto custa", "valor"],
    resposta: () => ({
      assunto: "comprar",
      texto:
        "Temos peças para comprar e peças para alugar — o preço de cada uma está na sua página. Diga-me o que procura (gala, cerimónia, noiva, criança) que eu indico onde ver.",
      ligacoes: [
        { texto: "Colecções", href: "/colecoes" },
        { texto: "Toda a loja", href: "/loja" },
      ],
    }),
  },
  {
    chave: "saudacao",
    palavras: ["ola", "olá", "bom dia", "boa tarde", "boa noite", "hey", "oi", "como esta", "como está"],
    resposta: (d) => ({
      assunto: "saudacao",
      texto: `Olá! Sou a ${d.assistente}, da ${d.nomeDaLoja}. Posso falar-lhe de alugueres, compras, provas no ateliê, maquilhagem, sapatos ou entregas.`,
    }),
  },
  {
    chave: "agradecimento",
    palavras: ["obrigada", "obrigado", "valeu", "agradecida", "agradecido"],
    resposta: () => ({
      assunto: "agradecimento",
      texto: "De nada! Se precisar de mais alguma coisa, estou aqui.",
    }),
  },
];

/** Botões que aparecem no início da conversa */
export const SUGESTOES_DA_JOYCE = [
  "Quero alugar um vestido",
  "Como marco uma prova?",
  "Fazem entregas?",
  "Onde fica a loja?",
  "Maquilhagem e sapatos",
];

export function responderDaJoyce(pergunta: string, dados: DadosDaLoja): RespostaDaJoyce {
  const texto = normalizar(pergunta);
  if (!texto) {
    return {
      assunto: "vazio",
      texto: "Diga-me em que posso ajudar: aluguer, compra, prova no ateliê, maquilhagem, sapatos ou entregas.",
    };
  }

  // Ganha o assunto com mais palavras encontradas; empate fica com o primeiro
  let melhor: { pontos: number; assunto: (typeof ASSUNTOS)[number] } | null = null;
  for (const assunto of ASSUNTOS) {
    // Sem acentos, "sábado" e "sabado" são a mesma palavra: não conta duas vezes
    const palavras = [...new Set(assunto.palavras.map(normalizar))];
    const pontos = palavras.reduce((total, palavra) => (texto.includes(palavra) ? total + 1 : total), 0);
    if (pontos > 0 && (!melhor || pontos > melhor.pontos)) melhor = { pontos, assunto };
  }

  if (melhor) return melhor.assunto.resposta(dados);

  return {
    assunto: "sem-resposta",
    semResposta: true,
    texto: `Essa não sei responder de cor — prefiro não inventar. Falo já com a equipa por si: escreva-nos pelo WhatsApp ${dados.whatsapp} ou ligue ${dados.telefone}.`,
  };
}
