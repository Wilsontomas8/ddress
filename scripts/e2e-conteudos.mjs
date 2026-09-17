/**
 * Colecções, Quem somos, solicitações, notificações e permissões.
 *
 *   node scripts/e2e-conteudos.mjs [url]
 *
 * Uma cliente pede maquilhagem e sapatos no site; a loja vê o aviso e trata
 * a solicitação; o administrador cria e apaga uma colecção, e tira ao
 * funcionário a edição dos conteúdos (depois repõe o padrão).
 */

import { mkdirSync } from "node:fs";
import { abrirNavegador } from "./navegador.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const TIROS = ".capturas/e2e";
mkdirSync(TIROS, { recursive: true });

const passos = [];
function passo(nome, ok, extra = "") {
  passos.push({ nome, ok });
  console.log(`${ok ? "  ok  " : " FALHA"} ${nome}${extra ? ` — ${extra}` : ""}`);
}

async function entrar(navegador, email, palavra) {
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 950 } });
  const pagina = await contexto.newPage();
  pagina.setDefaultTimeout(60000);
  await pagina.goto(`${BASE}/entrar`, { waitUntil: "domcontentloaded" });
  await hidratado(pagina, "form");
  await pagina.getByLabel("E-mail").fill(email);
  await pagina.getByLabel("Palavra-passe").fill(palavra);
  await pagina.getByRole("button", { name: "Entrar" }).click();
  await pagina.waitForURL("**/admin**", { timeout: 45000 });
  return { contexto, pagina };
}

/** Espera que o React tome conta do elemento (senão o clique envia o formulário à moda antiga) */
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

try {
  // ------------------------------------------------ site público
  const publico = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const site = await publico.newPage();
  site.setDefaultTimeout(60000);

  await site.goto(`${BASE}/quem-somos`, { waitUntil: "domcontentloaded" });
  passo("Quem somos mostra os destaques", await site.getByText("Mulheres atendidas", { exact: false }).first().isVisible());
  passo("Quem somos tem vídeo", (await site.locator("video").count()) > 0);
  await site.screenshot({ path: `${TIROS}/conteudos-quem-somos.png` });

  await site.goto(`${BASE}/colecoes`, { waitUntil: "domcontentloaded" });
  const primeira = site.locator('a[href^="/colecoes/"]').first();
  const destino = await primeira.getAttribute("href");
  await site.goto(`${BASE}${destino}`, { waitUntil: "domcontentloaded" });
  const pecas = await site.locator("#pecas a[href^='/produto/']").count();
  passo("Página da colecção lista peças", pecas > 0, `${destino}: ${pecas} ligações`);

  await site.goto(`${BASE}/maquilhagem`, { waitUntil: "domcontentloaded" });
  await hidratado(site, "main form");
  const formMaq = site.locator("form").first();
  await formMaq.getByLabel("Nome completo").fill("Teresa Percurso");
  await formMaq.getByLabel("Telefone").fill("923 111 222");
  const amanha = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  await formMaq.getByLabel("Dia do evento").fill(amanha);
  await formMaq.getByRole("button", { name: "Enviar pedido de maquilhagem" }).click();
  const codigo = (await site.locator("p.num").first().innerText({ timeout: 45000 })).trim();
  passo("Cliente envia pedido de maquilhagem", /^SOL-\d{4}-\d{4}$/.test(codigo), codigo);

  const formSap = site.locator("#sapatos form");
  await formSap.getByLabel("Nome completo").fill("Teresa Percurso");
  await formSap.getByLabel("Telefone").fill("923 111 222");
  await formSap.getByPlaceholder("Procurar sapatos").fill("dourad");
  await site.waitForTimeout(1500);
  await formSap.locator("ul button").first().click();
  await formSap.getByRole("button", { name: "Pedir sapatos" }).click();
  const codigoSapatos = (await site.locator("#sapatos p.num").first().innerText({ timeout: 45000 })).trim();
  passo("Cliente pede sapatos escolhidos", /^SOL-/.test(codigoSapatos), codigoSapatos);
  await publico.close();

  // ------------------------------------------------ loja (administrador)
  const { contexto: ctxAdmin, pagina: admin } = await entrar(navegador, "admin@ddress.ao", "admin123");

  await admin.goto(`${BASE}/admin/notificacoes`, { waitUntil: "domcontentloaded" });
  await hidratado(admin, "aside, nav");
  passo("Loja recebe o aviso da solicitação", await admin.getByText(`Nova solicitação ${codigo}`).first().isVisible());
  await admin.screenshot({ path: `${TIROS}/conteudos-notificacoes.png` });

  await admin.goto(`${BASE}/admin/solicitacoes`, { waitUntil: "domcontentloaded" });
  await hidratado(admin, "aside, nav");
  await admin.getByRole("link", { name: codigoSapatos }).click();
  await admin.waitForURL("**/admin/solicitacoes/**");
  await admin.getByRole("button", { name: "Marcar como em contacto" }).click();
  await admin.getByText("Em contacto", { exact: true }).first().waitFor({ timeout: 45000 });
  passo("Solicitação passa a em contacto", true);
  const checks = admin.locator('input[name="produtos"]');
  await checks.nth(1).check();
  await admin.getByRole("button", { name: "Guardar sugestões" }).click();
  const sugeriu = await admin.getByText("Sugestões guardadas.").waitFor({ timeout: 45000 }).then(() => true, () => false);
  passo("Loja sugere sapatos", sugeriu);
  await admin.screenshot({ path: `${TIROS}/conteudos-solicitacao.png`, fullPage: true });

  // Colecção nova
  await admin.goto(`${BASE}/admin/colecoes/nova`, { waitUntil: "domcontentloaded" });
  await hidratado(admin, "aside, nav");
  await admin.getByLabel("Nome", { exact: true }).fill("Percurso Teste");
  await admin.locator('input[name="produtos"]').first().check();
  await admin.getByRole("button", { name: "Criar colecção" }).click();
  await admin.waitForURL(/\/admin\/colecoes\/(?!nova)[^/]+$/, { timeout: 45000 });
  passo("Administrador cria colecção", true, admin.url());
  const r = await admin.request.get(`${BASE}/colecoes/percurso-teste`);
  passo("Colecção nova tem página no site", r.status() === 200, `estado ${r.status()}`);
  admin.once("dialog", (d) => d.accept());
  await admin.getByRole("button", { name: "Apagar" }).click();
  await admin.waitForURL("**/admin/colecoes", { timeout: 45000 });
  const r2 = await admin.request.get(`${BASE}/colecoes/percurso-teste`);
  passo("Colecção apagada deixa de existir", r2.status() === 404, `estado ${r2.status()}`);

  // Slide novo na página inicial
  await admin.goto(`${BASE}/admin/conteudos/inicio`, { waitUntil: "domcontentloaded" });
  await hidratado(admin, "aside, nav");
  const novo = admin.locator("form").last();
  await novo.locator('input[name="titleTop"]').fill("Percurso de teste");
  await novo.locator('input[name="titleBottom"]').fill("no ar.");
  await novo.locator('input[name="kicker"]').fill("Slide criado pelo percurso");
  await novo.locator('input[name="position"]').fill("-1");
  await novo.getByRole("button", { name: "Criar slide" }).click();
  await admin.getByText("Slide guardado.").first().waitFor({ timeout: 45000 });
  passo("Slide da página inicial criado no painel", true);

  const inicio = await admin.request.get(`${BASE}/`);
  const html = await inicio.text();
  passo("Página inicial mostra o slide novo", html.includes("Percurso de teste"));

  await admin.goto(`${BASE}/admin/conteudos/inicio`, { waitUntil: "domcontentloaded" });
  await hidratado(admin, "aside, nav");
  await admin.getByText("Percurso de teste", { exact: false }).first().click();
  admin.once("dialog", (d) => d.accept());
  await admin.getByRole("button", { name: "Apagar slide" }).first().click();
  await admin.waitForTimeout(2000);
  const depois = await (await admin.request.get(`${BASE}/`)).text();
  passo("Slide apagado sai da página inicial", !depois.includes("Percurso de teste"));

  // Permissões: funcionário passa a só ver os conteúdos
  await admin.goto(`${BASE}/admin/permissoes`, { waitUntil: "domcontentloaded" });
  await hidratado(admin, "aside, nav");
  await admin.screenshot({ path: `${TIROS}/conteudos-permissoes.png`, fullPage: true });
  await admin.locator('select[name="perm:FUNCIONARIO:conteudos"]').selectOption("ver");
  await admin.getByRole("button", { name: "Guardar permissões" }).click();
  await admin.getByText("permissão(ões) actualizada(s)").waitFor({ timeout: 45000 });
  passo("Administrador altera permissões", true);

  const { contexto: ctxFunc, pagina: func } = await entrar(navegador, "domingos@ddress.ao", "funcionario123");
  await func.goto(`${BASE}/admin/conteudos`, { waitUntil: "domcontentloaded" });
  await hidratado(func, "aside, nav");
  const botoes = await func.getByRole("button", { name: "Guardar texto" }).count();
  const bloqueado = await func.locator('input[name="title"]').isDisabled();
  passo("Funcionário só vê os conteúdos", botoes === 0 && bloqueado, `botões ${botoes}, campo bloqueado ${bloqueado}`);
  const equipa = await func.request.get(`${BASE}/admin/permissoes`, { maxRedirects: 0 });
  passo("Funcionário não abre as permissões", equipa.status() !== 200, `estado ${equipa.status()}`);
  await ctxFunc.close();

  await admin.goto(`${BASE}/admin/permissoes`, { waitUntil: "domcontentloaded" });
  await hidratado(admin, "aside, nav");
  admin.once("dialog", (d) => d.accept());
  await admin.getByRole("button", { name: "Repor padrão" }).click();
  await admin.waitForTimeout(2500);
  await admin.goto(`${BASE}/admin/permissoes`, { waitUntil: "domcontentloaded" });
  await hidratado(admin, "aside, nav");
  passo("Permissões repostas no padrão", (await admin.locator('select[name="perm:FUNCIONARIO:conteudos"]').inputValue()) === "editar");

  await admin.goto(`${BASE}/admin/auditoria?tipo=PAINEL`, { waitUntil: "domcontentloaded" });
  await hidratado(admin, "aside, nav");
  passo("Auditoria regista as alterações do painel", await admin.getByText("Permissões repostas no padrão").first().isVisible());

  for (const rota of ["conteudos", "parceiros", "colecoes"]) {
    await admin.goto(`${BASE}/admin/${rota}`, { waitUntil: "domcontentloaded" });
  await hidratado(admin, "aside, nav");
    await admin.screenshot({ path: `${TIROS}/conteudos-admin-${rota}.png`, fullPage: true });
  }
  await ctxAdmin.close();
} catch (e) {
  passo("Percurso dos conteúdos sem exceções", false, String(e).split("\n")[0]);
} finally {
  await navegador.close();
}

const falhas = passos.filter((p) => !p.ok);
console.log(`\n${passos.length - falhas.length}/${passos.length} verificações.`);
console.log(`Imagens em ${TIROS}`);
process.exit(falhas.length ? 1 : 0);
