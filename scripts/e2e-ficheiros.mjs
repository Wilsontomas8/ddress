/**
 * Ficheiros, facturas e relatório.
 *
 *   node scripts/e2e-ficheiros.mjs [url]
 *
 * A equipa carrega a fotografia de uma peça, regista o número da factura
 * do CEGID num pedido (a cliente vê-o na página do pedido dela) e o
 * relatório do mês abre em folha pronta a imprimir.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { abrirNavegador } from "./navegador.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const TIROS = ".capturas/e2e";
mkdirSync(TIROS, { recursive: true });

const passos = [];
function passo(nome, ok, extra = "") {
  passos.push({ nome, ok });
  console.log(
    `${ok ? "  ok  " : " FALHA"} ${nome}${extra ? ` — ${extra}` : ""}`,
  );
}

async function hidratado(pagina, seletor) {
  await pagina.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return !!el && Object.keys(el).some((k) => k.startsWith("__react"));
    },
    seletor,
    { timeout: 60000 },
  );
}

const navegador = await abrirNavegador();
// PNG de 1×1 píxel, para testar o carregamento de fotografias
const foto = path.join(TIROS, "foto-de-teste.png");
writeFileSync(
  foto,
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

try {
  const contexto = await navegador.newContext({
    viewport: { width: 1440, height: 950 },
  });
  const pagina = await contexto.newPage();
  pagina.setDefaultTimeout(60000);
  pagina.setDefaultNavigationTimeout(120000);

  await pagina.goto(`${BASE}/entrar`, { waitUntil: "domcontentloaded" });
  await hidratado(pagina, "form");
  await pagina.getByLabel("E-mail", { exact: true }).fill("admin@ddress.ao");
  await pagina.getByLabel("Palavra-passe").fill("admin123");
  await pagina.getByRole("button", { name: "Entrar" }).click();
  await pagina.waitForURL("**/admin**", { timeout: 120000 });

  // ------------------------------------------------ fotografia de uma peça
  await pagina.goto(`${BASE}/admin/produtos`, { waitUntil: "domcontentloaded" });
  await pagina.locator('tbody a[href^="/admin/produtos/"]').first().click();
  await pagina.waitForURL(/\/admin\/produtos\/[^/]+$/, { timeout: 90000 });
  await hidratado(pagina, "main");
  await pagina.locator('input[type="file"]').first().setInputFiles(foto);
  await pagina.getByText("Carregado.").first().waitFor({ timeout: 60000 });
  const endereco = await pagina.locator('input[name="imagem"]').inputValue();
  passo("Fotografia carregada pelo painel", endereco.includes("/"), endereco);

  // ------------------------------------------------ factura num pedido
  await pagina.goto(`${BASE}/admin/pedidos`, { waitUntil: "domcontentloaded" });
  const primeiro = pagina.locator('a[href^="/admin/pedidos/"]').first();
  await primeiro.waitFor();
  await primeiro.click();
  await pagina.waitForURL(/\/admin\/pedidos\/[^/]+$/, { timeout: 45000 });
  await hidratado(pagina, "main");
  const numero = (await pagina.locator("h1").first().innerText()).replace(
    /[^A-Z0-9-]/g,
    "",
  );

  const referencia = `FT 2026/${Date.now().toString().slice(-4)}`;
  await pagina.locator('input[name="reference"]').fill(referencia);
  await pagina.getByRole("button", { name: "Registar factura" }).click();
  await pagina.getByText("Factura registada.").waitFor({ timeout: 45000 });
  passo("Número da factura do CEGID registado no pedido", true, referencia);
  await pagina.screenshot({
    path: `${TIROS}/ficheiros-pedido-admin.png`,
    fullPage: true,
  });

  // ------------------------------------------------ a cliente vê a factura
  const publico = await navegador.newContext();
  const site = await publico.newPage();
  site.setDefaultTimeout(60000);

  site.setDefaultNavigationTimeout(120000);
  await site.goto(`${BASE}/pedido/${numero}`, {
    waitUntil: "domcontentloaded",
  });
  passo(
    "Cliente vê a factura no seu pedido",
    await site
      .getByText(`Factura ${referencia}`)
      .first()
      .isVisible(),
    numero,
  );
  await publico.close();

  // ------------------------------------------------ relatório para imprimir
  await pagina.goto(`${BASE}/admin/relatorios`, {
    waitUntil: "domcontentloaded",
  });
  await pagina.getByRole("link", { name: "Imprimir / PDF" }).click();
  await pagina.waitForURL("**/admin/relatorios/imprimir**", { timeout: 45000 });
  const folha = pagina.locator(".folha");
  await folha.waitFor();
  passo(
    "Relatório abre em folha para imprimir",
    await folha.getByText("Resumo do mês").isVisible(),
  );
  passo(
    "Folha mostra a morada da loja",
    await folha.getByText("Cassenda", { exact: false }).first().isVisible(),
  );
  await pagina.emulateMedia({ media: "print" });
  await pagina.screenshot({
    path: `${TIROS}/ficheiros-relatorio-folha.png`,
    fullPage: true,
  });
  await pagina.emulateMedia({ media: "screen" });

  // aviso de disponibilidade: pedido da cliente e lista no painel
  const sapatos = await (
    await pagina.request.get(`${BASE}/api/sapatos?q=`)
  ).json();
  const peca = sapatos.sapatos?.[0];
  const espera = await pagina.request.post(`${BASE}/api/espera`, {
    data: {
      produtoId: peca.id,
      nome: "Espera Percurso",
      telefone: `9237${Date.now().toString().slice(-5)}`,
      email: "espera.percurso@exemplo.ao",
    },
  });
  passo(
    "Cliente pede para ser avisada quando a peça voltar",
    espera.ok(),
    peca?.nome ?? "",
  );

  await pagina.goto(`${BASE}/admin/clientes`, {
    waitUntil: "domcontentloaded",
  });
  passo(
    "Painel mostra quem está à espera",
    await pagina.getByText("Espera Percurso").first().isVisible(),
  );
  passo(
    "Painel mostra a lista da newsletter",
    await pagina.getByRole("heading", { name: "Newsletter" }).isVisible(),
  );

  const csv = await pagina.request.get(`${BASE}/api/relatorios`);
  passo(
    "Exportação para Excel continua a responder",
    csv.ok(),
    `estado ${csv.status()}`,
  );
  await contexto.close();
} catch (e) {
  passo("Percurso dos ficheiros sem exceções", false, String(e).split("\n")[0]);
} finally {
  await navegador.close();
}

const falhas = passos.filter((p) => !p.ok);
console.log(
  `\n${passos.length - falhas.length}/${passos.length} verificações.`,
);
console.log(`Imagens em ${TIROS}`);
process.exit(falhas.length ? 1 : 0);
