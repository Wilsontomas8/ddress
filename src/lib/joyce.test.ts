import { describe, expect, it } from "vitest";
import { normalizar, responderDaJoyce, type DadosDaLoja } from "./joyce";

const LOJA: DadosDaLoja = {
  nomeDaLoja: "DDRESS",
  telefone: "+244 923 033 861",
  whatsapp: "+244 923 033 861",
  email: "atendimentoddress@gmail.com",
  morada: "Cassenda, rua da Shoprite, Luanda, Angola",
  mapsUrl: "https://www.google.com/maps/place/DDRESS",
  horaAbertura: "09:00",
  horaFecho: "18:00",
  diasAbertos: [1, 2, 3, 4, 5, 6],
  taxaDeEntrega: 2500,
  horasParaProva: 24,
  assistente: "Joyce",
};

describe("a Joyce responde", () => {
  it("sobre aluguer, com a regra da prova", () => {
    const r = responderDaJoyce("Quero alugar um vestido para sábado", LOJA);
    expect(r.assunto).toBe("aluguer");
    expect(r.texto).toContain("24 horas");
    expect(r.ligacoes?.some((l) => l.href === "/loja?tipo=aluguer")).toBe(true);
  });

  it("sobre a morada e o horário, com os dados da loja", () => {
    const r = responderDaJoyce("onde fica a loja?", LOJA);
    expect(r.assunto).toBe("morada");
    expect(r.texto).toContain("Cassenda");
    expect(r.texto).toContain("de segunda a sábado");
  });

  it("sobre entregas, com a taxa em kwanzas", () => {
    const r = responderDaJoyce("Fazem entregas em casa?", LOJA);
    expect(r.assunto).toBe("entrega");
    expect(r.texto).toContain("2 500 Kz");
  });

  it("mesmo sem acentos nem maiúsculas", () => {
    expect(responderDaJoyce("MAQUIAGEM", LOJA).assunto).toBe("maquilhagem");
    expect(responderDaJoyce("marcar prova no atelie", LOJA).assunto).toBe("prova");
  });

  it("e manda falar com uma pessoa quando não sabe", () => {
    const r = responderDaJoyce("aceitam criptomoeda?", LOJA);
    expect(r.semResposta).toBe(true);
    expect(r.texto).toContain("+244 923 033 861");
  });

  it("sem inventar quando a pergunta vem vazia", () => {
    expect(responderDaJoyce("   ", LOJA).assunto).toBe("vazio");
  });
});

describe("normalizar", () => {
  it("tira acentos e espaços das pontas", () => {
    expect(normalizar("  Cerimónia ")).toBe("cerimonia");
  });
});
