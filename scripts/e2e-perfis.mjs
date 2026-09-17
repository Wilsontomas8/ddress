/**
 * Matriz de perfis (RBAC) no painel.
 *
 *   node scripts/e2e-perfis.mjs [url]
 *
 * Entra com cada conta da equipa, confirma que a navegação mostra
 * exactamente as secções do seu perfil, e que uma rota fora do perfil
 * não abre.
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const TIROS = "/tmp/ddress-e2e";
mkdirSync(TIROS, { recursive: true });

const executablePath = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const PERFIS = [
  {
    nome: "Administrador",
    email: "admin@ddress.ao",
    palavra: "admin123",
    seccoes: [
      "Resumo",
      "Pedidos",
      "Provas",
      "Alugueres",
      "Entregas",
      "Peças",
      "Clientes",
      "Relatórios",
      "Auditoria",
      "Equipa",
      "Definições",
    ],
    proibida: null,
    tiro: "perfil-admin",
  },
  {
    nome: "Funcionário",
    email: "domingos@ddress.ao",
    palavra: "funcionario123",
    seccoes: ["Resumo", "Pedidos", "Provas", "Alugueres", "Entregas", "Peças", "Clientes"],
    proibida: { rota: "/admin/equipa", esperado: "/admin" },
    tiro: "perfil-funcionario",
  },
  {
    nome: "Suporte técnico",
    email: "suporte@ddress.ao",
    palavra: "suporte123",
    seccoes: ["Resumo", "Pedidos", "Auditoria", "Definições"],
    proibida: { rota: "/admin/equipa", esperado: "/admin" },
    tiro: "perfil-suporte",
  },
  {
    nome: "Contabilista",
    email: "contabilidade@ddress.ao",
    palavra: "conta123",
    seccoes: ["Resumo", "Relatórios"],
    proibida: { rota: "/admin/pedidos", esperado: "/admin" },
    tiro: "perfil-contabilista",
  },
  {
    nome: "Motorista",
    email: "motorista@ddress.ao",
    palavra: "motorista123",
    seccoes: ["Entregas"],
    proibida: { rota: "/admin/pedidos", esperado: "/admin/entregas" },
    tiro: "perfil-motorista",
  },
];

const passos = [];
function passo(nome, ok, extra = "") {
  passos.push({ nome, ok });
  console.log(`${ok ? "  ok  " : " FALHA"} ${nome}${extra ? ` — ${extra}` : ""}`);
}

const navegador = await chromium.launch({ executablePath, args: ["--no-sandbox"] });

try {
  for (const perfil of PERFIS) {
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 950 } });
    const pagina = await contexto.newPage();

    await pagina.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
    await pagina.getByLabel("E-mail").fill(perfil.email);
    await pagina.getByLabel("Palavra-passe").fill(perfil.palavra);
    await pagina.getByRole("button", { name: "Entrar" }).click();
    await pagina.waitForURL("**/admin**", { timeout: 30000 });
    await pagina.waitForTimeout(700);

    // Secções visíveis na navegação do painel
    const visiveis = await pagina.locator("nav a").allInnerTexts();
    const limpas = visiveis
      .map((t) => t.replace(/\d+$/, "").trim())
      .filter((t) =>
        [
          "Resumo",
          "Pedidos",
          "Provas",
          "Alugueres",
          "Entregas",
          "Peças",
          "Clientes",
          "Relatórios",
          "Auditoria",
          "Equipa",
          "Definições",
        ].includes(t)
      );

    const emFalta = perfil.seccoes.filter((s) => !limpas.includes(s));
    const aMais = limpas.filter((s) => !perfil.seccoes.includes(s));

    passo(
      `${perfil.nome}: vê exactamente as suas secções`,
      emFalta.length === 0 && aMais.length === 0,
      emFalta.length || aMais.length
        ? `faltam [${emFalta}] a mais [${aMais}]`
        : limpas.join(", ")
    );

    await pagina.screenshot({ path: `${TIROS}/${perfil.tiro}.png`, fullPage: true });

    // Rota fora do perfil
    if (perfil.proibida) {
      await pagina.goto(`${BASE}${perfil.proibida.rota}`, { waitUntil: "networkidle" });
      const url = pagina.url().replace(BASE, "");
      passo(
        `${perfil.nome}: ${perfil.proibida.rota} fica fora do alcance`,
        !url.startsWith(perfil.proibida.rota),
        `foi para ${url}`
      );
    }

    await contexto.close();
  }

  // O motorista regista uma entrega e uma recolha
  {
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 950 } });
    const pagina = await contexto.newPage();
    await pagina.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
    await pagina.getByLabel("E-mail").fill("motorista@ddress.ao");
    await pagina.getByLabel("Palavra-passe").fill("motorista123");
    await pagina.getByRole("button", { name: "Entrar" }).click();
    await pagina.waitForURL("**/admin/entregas", { timeout: 30000 });

    const entregar = pagina.getByRole("button", { name: "Entregue ao cliente" }).first();
    if (await entregar.isVisible().catch(() => false)) {
      await entregar.click();
      await pagina.waitForTimeout(2500);
      // depois de entregue, a tarefa sai da lista
      const texto = await pagina.locator("body").innerText();
      passo(
        "Motorista regista a entrega",
        /Entrega registada/i.test(texto) || /Não há entregas por fazer/i.test(texto)
      );
    } else {
      passo("Motorista regista a entrega", false, "sem entregas na lista");
    }

    const recolher = pagina.getByRole("button", { name: "Peça recolhida" }).first();
    if (await recolher.isVisible().catch(() => false)) {
      await recolher.click();
      await pagina.waitForTimeout(2500);
      const depois = await pagina.locator("body").innerText();
      passo(
        "Motorista regista a recolha e a peça entra em higienização",
        /higieniza/i.test(depois) || /Não há recolhas/i.test(depois)
      );
    } else {
      passo("Motorista regista a recolha e a peça entra em higienização", false, "sem recolhas");
    }

    await pagina.screenshot({ path: `${TIROS}/perfil-motorista-accoes.png`, fullPage: true });
    await contexto.close();
  }

  // O contabilista pode exportar; o motorista não.
  for (const [nome, email, palavra, esperado] of [
    ["Contabilista", "contabilidade@ddress.ao", "conta123", 200],
    ["Motorista", "motorista@ddress.ao", "motorista123", 403],
  ]) {
    const contexto = await navegador.newContext();
    const pagina = await contexto.newPage();
    await pagina.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
    await pagina.getByLabel("E-mail").fill(email);
    await pagina.getByLabel("Palavra-passe").fill(palavra);
    await pagina.getByRole("button", { name: "Entrar" }).click();
    await pagina.waitForURL("**/admin**", { timeout: 30000 });

    const resposta = await pagina.request.get(`${BASE}/api/relatorios`);
    passo(
      `${nome}: exportação financeira responde ${esperado}`,
      resposta.status() === esperado,
      `recebeu ${resposta.status()}`
    );
    await contexto.close();
  }
} catch (e) {
  passo("Percurso dos perfis sem exceções", false, String(e).split("\n")[0]);
} finally {
  await navegador.close();
}

const falhas = passos.filter((p) => !p.ok);
console.log(`\n${passos.length - falhas.length}/${passos.length} verificações.`);
console.log(`Imagens em ${TIROS}`);
process.exit(falhas.length ? 1 : 0);
