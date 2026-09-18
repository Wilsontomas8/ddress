/**
 * Contas e telemóvel.
 *
 *   node scripts/e2e-contas.mjs [url]
 *
 * Cria uma conta, esquece a palavra-passe, define outra pela ligação,
 * confirma o travão às tentativas erradas e verifica no tamanho de
 * telemóvel o menu e a galeria do Quem somos.
 */

import { mkdirSync } from "node:fs";
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
const marca = Date.now().toString(36);
const EMAIL = `percurso.${marca}@exemplo.ao`;

try {
  // ------------------------------------------------ conta nova
  const contexto = await navegador.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const pagina = await contexto.newPage();
  pagina.setDefaultTimeout(60000);
  pagina.setDefaultNavigationTimeout(120000);

  // As contas nascem noutro contexto: o registo deixa sessão aberta e /entrar
  // passaria logo para a área do cliente.
  const balcao = await navegador.newContext();
  const registo = await balcao.request.post(`${BASE}/api/auth/registar`, {
    data: {
      nome: "Cliente Percurso",
      email: EMAIL,
      telefone: "923 000 999",
      password: "primeira123",
    },
  });
  passo(
    "Conta criada para o percurso",
    registo.ok(),
    `estado ${registo.status()}`,
  );

  // ------------------------------------------------ esqueci-me
  await pagina.goto(`${BASE}/entrar`, { waitUntil: "domcontentloaded" });
  await hidratado(pagina, "form");
  await pagina.getByRole("link", { name: "Esqueci-me" }).click();
  await pagina.waitForURL("**/recuperar");
  await hidratado(pagina, "form");
  await pagina.getByLabel("E-mail da conta").fill(EMAIL);
  await pagina.getByRole("button", { name: "Enviar ligação" }).click();
  await pagina
    .getByText("Se existir conta com esse e-mail")
    .waitFor({ timeout: 45000 });
  passo("Pedido de nova palavra-passe aceite", true);

  const ligacao = await pagina
    .locator("a[href*='/recuperar/']")
    .first()
    .getAttribute("href");
  passo("Ligação de recuperação disponível em testes", !!ligacao);

  // A ligação traz o endereço público do site; em testes segue-se só o caminho.
  const caminho = new URL(ligacao, BASE).pathname;
  await pagina.goto(`${BASE}${caminho}`, { waitUntil: "domcontentloaded" });
  await hidratado(pagina, "form");
  await pagina.getByLabel("Nova palavra-passe").fill("segunda12345");
  await pagina.getByLabel("Repita a palavra-passe").fill("segunda12345");
  await pagina.getByRole("button", { name: "Guardar palavra-passe" }).click();
  await pagina.getByText("Palavra-passe guardada").waitFor({ timeout: 45000 });
  passo("Palavra-passe redefinida", true);

  const repetida = await pagina.request.post(`${BASE}/api/auth/redefinir`, {
    data: { codigo: caminho.split("/").pop(), password: "terceira123" },
  });
  passo(
    "A mesma ligação não serve duas vezes",
    repetida.status() === 400,
    `estado ${repetida.status()}`,
  );

  await pagina.goto(`${BASE}/entrar`, { waitUntil: "domcontentloaded" });
  await hidratado(pagina, "form");
  await pagina.getByLabel("E-mail", { exact: true }).fill(EMAIL);
  await pagina.getByLabel("Palavra-passe").fill("segunda12345");
  await pagina.getByRole("button", { name: "Entrar" }).click();
  await pagina.waitForURL("**/conta", { timeout: 45000 });
  passo("Entra com a palavra-passe nova", true);

  // ------------------------------------------------ travão às tentativas
  const outro = `travao.${marca}@exemplo.ao`;
  await balcao.request.post(`${BASE}/api/auth/registar`, {
    data: {
      nome: "Travão Percurso",
      email: outro,
      telefone: "923 000 998",
      password: "primeira123",
    },
  });
  let ultimo = 0;
  for (let i = 0; i < 9; i++) {
    const r = await pagina.request.post(`${BASE}/api/auth/entrar`, {
      data: { email: outro, password: "errada" },
      failOnStatusCode: false,
    });
    ultimo = r.status();
  }
  passo(
    "Tentativas erradas travam a entrada",
    ultimo === 429,
    `última resposta ${ultimo}`,
  );
  await balcao.close();
  await contexto.close();

  // ------------------------------------------------ a Joyce responde
  const visita = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const loja = await visita.newPage();
  loja.setDefaultTimeout(60000);
  loja.setDefaultNavigationTimeout(120000);
  await loja.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await hidratado(loja, "header");
  await loja.getByRole("button", { name: /Falar com a/ }).click();
  const conversa = loja.getByRole("dialog", { name: /assistente comercial/ });
  await conversa.waitFor();
  passo("A assistente cumprimenta quem chega", await conversa.getByText("assistente comercial", { exact: false }).first().isVisible());

  await conversa.getByRole("button", { name: "Fazem entregas?" }).click();
  await conversa.getByText("Entregamos em Luanda", { exact: false }).waitFor({ timeout: 30000 });
  passo("Responde sobre entregas com a taxa da loja", true);

  await conversa.getByLabel("Escreva a sua pergunta").fill("aceitam criptomoeda?");
  await conversa.getByRole("button", { name: "Enviar" }).click();
  await conversa.getByText("prefiro não inventar", { exact: false }).waitFor({ timeout: 30000 });
  passo("Quando não sabe, encaminha para uma pessoa", true);
  await loja.screenshot({ path: `${TIROS}/contas-joyce.png` });
  await visita.close();

  // ------------------------------------------------ telemóvel
  const movel = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const tele = await movel.newPage();
  tele.setDefaultTimeout(60000);
  tele.setDefaultNavigationTimeout(120000);

  await tele.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await hidratado(tele, "header");
  await tele.getByRole("button", { name: "Abrir menu" }).click();
  const menu = tele.getByRole("dialog", { name: "Menu" });
  await menu.waitFor();
  const alturaMenu = (await menu.boundingBox())?.height ?? 0;
  const verQuemSomos = await menu
    .getByRole("link", { name: "Quem somos" })
    .isVisible();
  passo(
    "Menu do telemóvel ocupa o ecrã e mostra as páginas",
    alturaMenu > 700 && verQuemSomos,
    `altura ${Math.round(alturaMenu)}px`,
  );
  await tele.screenshot({ path: `${TIROS}/contas-menu-telemovel.png` });
  await menu.getByRole("link", { name: "Quem somos" }).click();
  await tele.waitForURL("**/quem-somos", { timeout: 45000 });

  const larguras = await tele.evaluate(() => {
    const g = document.querySelector('[aria-roledescription="carrossel"]');
    return {
      galeria: g ? Math.round(g.getBoundingClientRect().width) : 0,
      ecra: window.innerWidth,
      documento: document.documentElement.scrollWidth,
    };
  });
  passo(
    "Galeria do Quem somos cabe no telemóvel",
    larguras.galeria > 0 &&
      larguras.galeria <= larguras.ecra &&
      larguras.documento <= larguras.ecra,
    `galeria ${larguras.galeria}px, ecrã ${larguras.ecra}px`,
  );

  // newsletter no rodapé
  await tele
    .getByRole("contentinfo")
    .getByPlaceholder("O seu e-mail")
    .fill(`novidades.${marca}@exemplo.ao`);
  await tele
    .getByLabel(
      "Autorizo a DDRESS a enviar-me novidades por e-mail. Posso sair quando quiser.",
    )
    .check();
  await tele.getByRole("button", { name: "Receber novidades" }).click();
  await tele
    .getByText("Está na lista", { exact: false })
    .waitFor({ timeout: 45000 });
  passo("Inscrição na newsletter com autorização", true);

  const mapa = tele.locator('iframe[title^="Mapa"]');
  await mapa.scrollIntoViewIfNeeded();
  passo("Quem somos mostra o mapa da loja", await mapa.isVisible());
  passo(
    "Morada da loja no rodapé",
    await tele
      .getByRole("contentinfo")
      .getByText("Cassenda", { exact: false })
      .first()
      .isVisible(),
  );
  await tele.screenshot({
    path: `${TIROS}/contas-quem-somos-telemovel.png`,
    fullPage: true,
  });
  await movel.close();
} catch (e) {
  passo("Percurso das contas sem exceções", false, String(e).split("\n")[0]);
} finally {
  await navegador.close();
}

const falhas = passos.filter((p) => !p.ok);
console.log(
  `\n${passos.length - falhas.length}/${passos.length} verificações.`,
);
console.log(`Imagens em ${TIROS}`);
process.exit(falhas.length ? 1 : 0);
