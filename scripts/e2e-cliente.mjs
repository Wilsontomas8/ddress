/**
 * Percurso completo do cliente, do catálogo ao pedido criado.
 *
 *   node scripts/e2e-cliente.mjs [url]
 *
 * Abre o site num navegador real e faz o que um cliente faria: escolhe
 * uma peça de aluguer, escolhe as datas, marca a prova no ateliê,
 * finaliza o pedido e confirma que o número do pedido aparece.
 */

import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const TIROS = ".capturas/e2e";
mkdirSync(TIROS, { recursive: true });

import { abrirNavegador } from "./navegador.mjs";

function dia(offset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

const passos = [];
function passo(nome, ok, extra = "") {
  passos.push({ nome, ok, extra });
  console.log(`${ok ? "  ok  " : " FALHA"} ${nome}${extra ? ` — ${extra}` : ""}`);
}

const navegador = await abrirNavegador();
const contexto = await navegador.newContext({ viewport: { width: 1360, height: 1000 } });
const pagina = await contexto.newPage();

const errosDeConsola = [];
pagina.on("pageerror", (e) => errosDeConsola.push(String(e)));

try {
  // ------------------------------------------------------- catálogo
  await pagina.goto(`${BASE}/loja/mulher`, { waitUntil: "networkidle" });
  const cartoes = await pagina.locator("article").count();
  passo("A secção Mulher lista peças", cartoes > 0, `${cartoes} peças`);

  // --------------------------------------------------------- peça
  await pagina.goto(`${BASE}/produto/vestido-gala-bordeaux`, { waitUntil: "networkidle" });
  passo(
    "Página da peça abre",
    (await pagina.locator("h1").innerText()).includes("Vestido de Gala")
  );

  // A peça 38 está reservada no cenário de demonstração: confirmamos
  // que o site o diz antes de escolher outro tamanho.
  await pagina.getByRole("button", { name: "38", exact: true }).click();
  await pagina.waitForTimeout(500);
  const textoOcupada = await pagina.locator("body").innerText();
  passo(
    "Peça com reserva aparece como indisponível",
    /reservada, volta a/i.test(textoOcupada),
    (textoOcupada.match(/reservada, volta a [^\n]+/i) ?? [""])[0]
  );

  // Escolher um tamanho livre
  await pagina.getByRole("button", { name: "36", exact: true }).click();
  await pagina.waitForTimeout(400);
  passo("Tamanho livre selecionado", true, "36");

  // O próprio site diz a partir de que dia a peça pode sair
  const campoInicio = pagina.locator('input[type="date"]').first();
  const minimo = (await campoInicio.getAttribute("min")) ?? dia(1);
  const base = new Date(`${minimo}T00:00:00Z`);
  const maisDias = (n) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const inicio = maisDias(7);
  const fim = maisDias(9);
  await campoInicio.fill(inicio);
  await pagina.locator('input[type="date"]').nth(1).fill(fim);

  const temOrcamento = await pagina
    .getByText("A pagar agora")
    .waitFor({ timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  passo("Orçamento do aluguer calculado no servidor", temOrcamento, `${inicio} → ${fim}`);

  await pagina.screenshot({ path: `${TIROS}/1-produto.png`, fullPage: true });

  // Calendário de prova (obrigatória nesta peça)
  await pagina.getByText("Resido em Luanda", { exact: false }).first().waitFor({ timeout: 5000 });
  const botoesHora = pagina.locator("button").filter({ hasText: /^\d{2}:\d{2}$/ });
  await botoesHora.first().waitFor({ timeout: 8000 });

  // Escolher a primeira hora que não esteja desativada
  const total = await botoesHora.count();
  let horaEscolhida = null;
  for (let i = 0; i < total; i++) {
    const b = botoesHora.nth(i);
    if (await b.isEnabled()) {
      horaEscolhida = await b.innerText();
      await b.click();
      break;
    }
  }
  passo("Horário de prova escolhido no calendário da peça", !!horaEscolhida, horaEscolhida ?? "");

  await pagina.waitForTimeout(300);
  await pagina.screenshot({ path: `${TIROS}/2-calendario.png`, fullPage: true });

  // ------------------------------------------------------ carrinho
  await pagina.getByRole("button", { name: "Finalizar pedido" }).click();
  await pagina.waitForURL("**/carrinho", { timeout: 45000 });
  passo("Peça no carrinho", await pagina.getByText("Vestido de Gala").first().isVisible());
  await pagina.screenshot({ path: `${TIROS}/3-carrinho.png`, fullPage: true });

  // ------------------------------------------------------ checkout
  await pagina.getByRole("link", { name: "Continuar", exact: true }).click();
  await pagina.waitForURL("**/checkout", { timeout: 45000 });

  await pagina.getByLabel("Nome completo").fill("Teresa Domingos");
  await pagina.getByLabel("Telefone").fill("+244 927 555 111");
  await pagina.getByLabel("E-mail (opcional)").fill("teresa@exemplo.ao");
  await pagina.getByText("Multicaixa Express", { exact: false }).first().click();
  await pagina.screenshot({ path: `${TIROS}/4-checkout.png`, fullPage: true });

  await pagina.getByRole("button", { name: "Enviar pedido" }).click();
  await pagina.waitForURL("**/pedido/**", { timeout: 60000 });

  const numero = await pagina.locator("h1").innerText();
  passo("Pedido criado", /DDR-\d{4}-\d{4}/.test(numero), numero);
  await pagina.screenshot({ path: `${TIROS}/5-pedido.png`, fullPage: true });

  // Depois do pedido, a peça que acabou de ser reservada sai do catálogo
  await pagina.goto(`${BASE}/produto/vestido-gala-bordeaux`, { waitUntil: "networkidle" });
  await pagina.getByRole("button", { name: "36", exact: true }).click();
  await pagina.waitForTimeout(600);
  const textoPeca = await pagina.locator("body").innerText();
  passo(
    "A peça acabada de reservar sai do catálogo",
    /reservada, volta a/i.test(textoPeca),
    (textoPeca.match(/reservada, volta a [^\n]+/i) ?? [""])[0]
  );

  passo("Sem erros de JavaScript na consola", errosDeConsola.length === 0, errosDeConsola[0] ?? "");
} catch (e) {
  passo("Percurso completo sem exceções", false, String(e).split("\n")[0]);
  await pagina.screenshot({ path: `${TIROS}/erro.png`, fullPage: true }).catch(() => {});
} finally {
  await navegador.close();
}

const falhas = passos.filter((p) => !p.ok);
console.log(`\n${passos.length - falhas.length}/${passos.length} passos concluídos.`);
console.log(`Imagens em ${TIROS}`);
process.exit(falhas.length ? 1 : 0);
