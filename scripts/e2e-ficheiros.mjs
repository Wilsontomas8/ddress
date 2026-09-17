/**
 * Ficheiros, facturas e relatório.
 *
 *   node scripts/e2e-ficheiros.mjs [url]
 *
 * A equipa carrega uma factura num pedido, a cliente vê-a na página do
 * pedido dela, e o relatório do mês abre em folha pronta a imprimir.
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
  console.log(`${ok ? "  ok  " : " FALHA"} ${nome}${extra ? ` — ${extra}` : ""}`);
}

async function hidratado(pagina, seletor) {
  await pagina.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return !!el && Object.keys(el).some((k) => k.startsWith("__react"));
    },
    seletor,
    { timeout: 60000 }
  );
}

const navegador = await abrirNavegador();
const pdf = path.join(TIROS, "factura-de-teste.pdf");
writeFileSync(pdf, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

try {
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 950 } });
  const pagina = await contexto.newPage();
  pagina.setDefaultTimeout(60000);

  await pagina.goto(`${BASE}/entrar`, { waitUntil: "domcontentloaded" });
  await hidratado(pagina, "form");
  await pagina.getByLabel("E-mail").fill("admin@ddress.ao");
  await pagina.getByLabel("Palavra-passe").fill("admin123");
  await pagina.getByRole("button", { name: "Entrar" }).click();
  await pagina.waitForURL("**/admin**", { timeout: 45000 });

  // ------------------------------------------------ factura num pedido
  await pagina.goto(`${BASE}/admin/pedidos`, { waitUntil: "domcontentloaded" });
  const primeiro = pagina.locator('a[href^="/admin/pedidos/"]').first();
  await primeiro.waitFor();
  await primeiro.click();
  await pagina.waitForURL(/\/admin\/pedidos\/[^/]+$/, { timeout: 45000 });
  await hidratado(pagina, "main");
  const numero = (await pagina.locator("h1").first().innerText()).replace(/[^A-Z0-9-]/g, "");

  await pagina.locator('input[type="file"]').first().setInputFiles(pdf);
  await pagina.getByText("Carregado.").first().waitFor({ timeout: 60000 });
  const endereco = await pagina.locator('input[name="url"]').first().inputValue();
  passo("Ficheiro carregado pelo painel", endereco.length > 0, endereco);

  const referencia = `FT 2026/${Date.now().toString().slice(-4)}`;
  await pagina.locator('input[name="reference"]').fill(referencia);
  await pagina.getByRole("button", { name: "Anexar" }).click();
  await pagina.getByText("Documento anexado.").waitFor({ timeout: 45000 });
  passo("Factura anexada ao pedido", true);
  await pagina.screenshot({ path: `${TIROS}/ficheiros-pedido-admin.png`, fullPage: true });

  // ------------------------------------------------ a cliente vê a factura
  const publico = await navegador.newContext();
  const site = await publico.newPage();
  site.setDefaultTimeout(60000);
  await site.goto(`${BASE}/pedido/${numero}`, { waitUntil: "domcontentloaded" });
  passo("Cliente vê a factura no seu pedido", await site.getByRole("link", { name: `Factura ${referencia}` }).first().isVisible(), numero);
  await publico.close();

  // ------------------------------------------------ relatório para imprimir
  await pagina.goto(`${BASE}/admin/relatorios`, { waitUntil: "domcontentloaded" });
  await pagina.getByRole("link", { name: "Imprimir / PDF" }).click();
  await pagina.waitForURL("**/admin/relatorios/imprimir**", { timeout: 45000 });
  const folha = pagina.locator(".folha");
  await folha.waitFor();
  passo("Relatório abre em folha para imprimir", await folha.getByText("Resumo do mês").isVisible());
  passo("Folha mostra a morada da loja", await folha.getByText("Cassenda", { exact: false }).first().isVisible());
  await pagina.emulateMedia({ media: "print" });
  await pagina.screenshot({ path: `${TIROS}/ficheiros-relatorio-folha.png`, fullPage: true });
  await pagina.emulateMedia({ media: "screen" });

  const csv = await pagina.request.get(`${BASE}/api/relatorios`);
  passo("Exportação para Excel continua a responder", csv.ok(), `estado ${csv.status()}`);
  await contexto.close();
} catch (e) {
  passo("Percurso dos ficheiros sem exceções", false, String(e).split("\n")[0]);
} finally {
  await navegador.close();
}

const falhas = passos.filter((p) => !p.ok);
console.log(`\n${passos.length - falhas.length}/${passos.length} verificações.`);
console.log(`Imagens em ${TIROS}`);
process.exit(falhas.length ? 1 : 0);
