import { describe, expect, it } from "vitest";
import { construirMatriz, paginaInicialDaMatriz, podeEditarNa, podeVerNa, recursosVisiveis } from "./permissoes";
import { ligacaoWhatsApp, numeroWhatsApp } from "./whatsapp";

describe("matriz de permissões", () => {
  it("o administrador vê e altera tudo, mesmo com ajustes guardados", () => {
    const m = construirMatriz("ADMIN", [{ resource: "pedidos", canView: false, canEdit: false }]);
    expect(podeEditarNa(m, "pedidos")).toBe(true);
    expect(podeEditarNa(m, "permissoes")).toBe(true);
  });

  it("a cliente não tem acesso a nada do painel", () => {
    expect(recursosVisiveis(construirMatriz("CLIENTE"))).toEqual([]);
  });

  it("usa o padrão do perfil quando não há ajustes", () => {
    const m = construirMatriz("CONTABILISTA");
    expect(recursosVisiveis(m)).toEqual(["resumo", "relatorios"]);
    expect(podeEditarNa(m, "relatorios")).toBe(false);
  });

  it("os ajustes do administrador substituem o padrão", () => {
    const m = construirMatriz("FUNCIONARIO", [
      { resource: "conteudos", canView: true, canEdit: false },
      { resource: "pedidos", canView: false, canEdit: false },
      { resource: "relatorios", canView: true, canEdit: false },
    ]);
    expect(m.conteudos).toBe("ver");
    expect(podeVerNa(m, "pedidos")).toBe(false);
    expect(podeVerNa(m, "relatorios")).toBe(true);
  });

  it("equipa e permissões ficam sempre só para o administrador", () => {
    const m = construirMatriz("SUPORTE", [
      { resource: "equipa", canView: true, canEdit: true },
      { resource: "permissoes", canView: true, canEdit: true },
    ]);
    expect(podeVerNa(m, "equipa")).toBe(false);
    expect(podeVerNa(m, "permissoes")).toBe(false);
  });

  it("ignora recursos desconhecidos e leva cada perfil à sua primeira página", () => {
    const m = construirMatriz("MOTORISTA", [{ resource: "inventado", canView: true, canEdit: true }]);
    expect(recursosVisiveis(m)).toEqual(["entregas"]);
    expect(paginaInicialDaMatriz(m)).toBe("/admin/entregas");
    expect(paginaInicialDaMatriz(construirMatriz("CLIENTE"))).toBe("/");
  });
});

describe("ligações de WhatsApp", () => {
  it("acrescenta o indicativo de Angola a números de 9 dígitos", () => {
    expect(numeroWhatsApp("923 033 861")).toBe("244923033861");
    expect(numeroWhatsApp("+244 923 033 861")).toBe("244923033861");
  });

  it("não cria ligação sem número e codifica a mensagem", () => {
    expect(ligacaoWhatsApp("")).toBeNull();
    expect(ligacaoWhatsApp("923033861", "Olá DDRESS & companhia")).toBe("https://wa.me/244923033861?text=Ol%C3%A1%20DDRESS%20%26%20companhia");
  });
});
