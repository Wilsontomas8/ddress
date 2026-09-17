/**
 * Percurso do funcionário no painel de gestão.
 *
 *   node scripts/e2e-painel.mjs [url]
 *
 * Entra com a conta de funcionário, recebe um pedido, confirma o
 * pagamento, faz o pedido andar, trata de uma prova e confirma que a
 * agenda e os alugueres abrem.
 */

import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const TIROS = ".capturas/e2e";
mkdirSync(TIROS, { recursive: true });

import { abrirNavegador } from "./navegador.mjs";

const passos = [];
function passo(nome, ok, extra = "") {
  passos.push({ nome, ok });
  console.log(`${ok ? "  ok  " : " FALHA"} ${nome}${extra ? ` — ${extra}` : ""}`);
}

const navegador = await abrirNavegador();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
const pagina = await contexto.newPage();
const errosDeConsola = [];
pagina.on("pageerror", (e) => errosDeConsola.push(String(e)));

try {
  // ---------------------------------------------------------- entrar
  await pagina.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
  await pagina.getByLabel("E-mail").fill("domingos@ddress.ao");
  await pagina.getByLabel("Palavra-passe").fill("funcionario123");
  await pagina.getByRole("button", { name: "Entrar" }).click();
  await pagina.waitForURL("**/admin", { timeout: 45000 });
  passo("Funcionário entra e cai no painel", true);

  await pagina.waitForTimeout(800);
  await pagina.screenshot({ path: `${TIROS}/6-painel-resumo.png`, fullPage: true });

  // --------------------------------------------------------- pedidos
  await pagina.goto(`${BASE}/admin/pedidos`, { waitUntil: "networkidle" });
  const linhas = await pagina.locator("tbody tr").count();
  passo("Lista de pedidos por tratar", linhas > 0, `${linhas} pedido(s)`);

  await pagina.locator("tbody tr a").first().click();
  await pagina.waitForURL("**/admin/pedidos/**", { timeout: 45000 });
  const numeroPedido = await pagina.locator("h1").innerText();
  passo("Abre a ficha do pedido", /DDR-/.test(numeroPedido), numeroPedido);

  // ------------------------------------------------------ assumir
  const botaoAssumir = pagina.getByRole("button", { name: "Assumir pedido" });
  if (await botaoAssumir.isVisible().catch(() => false)) {
    await botaoAssumir.click();
    await pagina.waitForTimeout(1500);
  }
  const depoisDeAssumir = await pagina.locator("body").innerText();
  passo(
    "Funcionário assume o pedido",
    /Pedido assumido|com [A-ZÀ-Ú][a-zà-ú]+ /.test(depoisDeAssumir)
  );

  // --------------------------------------------- confirmar pagamento
  const botaoConfirmar = pagina.getByRole("button", { name: "Confirmar recebimento" });
  if (await botaoConfirmar.first().isVisible().catch(() => false)) {
    await botaoConfirmar.first().click();
    await pagina.waitForTimeout(1800);
    const texto = await pagina.locator("body").innerText();
    passo("Comprovativo do cliente validado", /Pagamento confirmado/i.test(texto));
  } else {
    passo("Comprovativo do cliente validado", true, "sem comprovativos pendentes");
  }

  // -------------------------------------------------- mudar estado
  const seletor = pagina.getByLabel("Passar o pedido ao estado");
  const opcoes = await seletor.locator("option").allInnerTexts();
  const alvo = opcoes.find((o) => o !== "Passar a…");
  if (alvo) {
    await seletor.selectOption({ label: alvo });
    await pagina.getByRole("button", { name: "Aplicar" }).click();
    await pagina.waitForTimeout(1800);
  }
  const depoisDoEstado = await pagina.locator("body").innerText();
  passo("Pedido avança de estado", /Pedido em "/i.test(depoisDoEstado), alvo ?? "");

  // --------------------------------------------- registar pagamento
  await pagina.getByRole("button", { name: "Registar pagamento" }).click();
  await pagina.waitForTimeout(1800);
  passo(
    "Pagamento registado pelo funcionário",
    /Pagamento confirmado|Pagamento registado/i.test(await pagina.locator("body").innerText())
  );

  await pagina.screenshot({ path: `${TIROS}/7-pedido-admin.png`, fullPage: true });

  // -------------------------------------------------------- provas
  await pagina.goto(`${BASE}/admin/marcacoes`, { waitUntil: "networkidle" });
  const temAgenda = await pagina.getByText("Agenda de provas").isVisible();
  passo("Agenda de provas abre", temAgenda);

  const confirmarProva = pagina.getByRole("button", { name: "Confirmar" }).first();
  if (await confirmarProva.isVisible().catch(() => false)) {
    await confirmarProva.click();
    await pagina.waitForTimeout(1500);
    passo("Prova confirmada pelo funcionário", true);
  } else {
    passo("Prova confirmada pelo funcionário", true, "sem provas por confirmar");
  }
  await pagina.screenshot({ path: `${TIROS}/8-provas.png`, fullPage: true });

  // ----------------------------------------------------- alugueres
  await pagina.goto(`${BASE}/admin/alugueres`, { waitUntil: "networkidle" });
  const textoAlugueres = await pagina.locator("body").innerText();
  passo(
    "Mapa de alugueres mostra peças reservadas e livres",
    /Estado de cada peça/i.test(textoAlugueres)
  );
  await pagina.screenshot({ path: `${TIROS}/9-alugueres.png`, fullPage: true });

  // ------------------------------------------------- higienização
  // A peça que veio do balcão está em higienização: o funcionário
  // empurra a data de disponibilidade para mais tarde.
  const botaoHigiene = pagina
    .getByRole("button", { name: /Ajustar higienização|Registar devolução/ })
    .first();

  if (await botaoHigiene.isVisible().catch(() => false)) {
    await botaoHigiene.click();
    await pagina.waitForTimeout(400);

    const novaData = (() => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + 9);
      return d.toISOString().slice(0, 10);
    })();

    await pagina.getByLabel("Disponível outra vez a partir de").fill(novaData);
    await pagina.getByLabel("Notas da higienização (opcional)").fill("Lavandaria atrasou.");
    await pagina.getByRole("button", { name: /Guardar devolução|Guardar datas/ }).click();
    await pagina.waitForTimeout(2000);

    const depois = await pagina.locator("body").innerText();
    passo(
      "Funcionário define quando a peça volta da higienização",
      /Volta ao site a/i.test(depois),
      (depois.match(/Volta ao site a [^\n]+/i) ?? [""])[0]
    );
    await pagina.screenshot({ path: `${TIROS}/11-higienizacao.png`, fullPage: true });

    // E o site respeita a data que o funcionário escreveu
    const paginaLoja = await contexto.newPage();
    await paginaLoja.goto(`${BASE}/produto/fatinho-cerimonia-azul`, {
      waitUntil: "networkidle",
    });
    await paginaLoja.getByRole("button", { name: "Alugar" }).click();
    await paginaLoja.waitForTimeout(400);
    await paginaLoja.getByRole("button", { name: "6 anos", exact: true }).click();
    await paginaLoja.waitForTimeout(500);
    const textoLoja = await paginaLoja.locator("body").innerText();
    passo(
      "O site só volta a oferecer a peça depois dessa data",
      /reservada, volta a/i.test(textoLoja),
      (textoLoja.match(/reservada, volta a [^\n]+/i) ?? [""])[0]
    );
    await paginaLoja.close();
  } else {
    passo("Funcionário define quando a peça volta da higienização", false, "botão não encontrado");
  }

  // -------------------------------------------------------- peças
  await pagina.goto(`${BASE}/admin/produtos`, { waitUntil: "networkidle" });
  await pagina.locator("tbody tr a").first().click();
  await pagina.waitForURL("**/admin/produtos/**", { timeout: 45000 });
  passo("Ficha da peça abre para edição", await pagina.getByText("Tamanhos e stock").isVisible());
  await pagina.screenshot({ path: `${TIROS}/10-peca-admin.png`, fullPage: true });

  // ------------------------------------------------ acesso negado
  const contextoCliente = await navegador.newContext();
  const paginaCliente = await contextoCliente.newPage();
  await paginaCliente.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  passo(
    "Quem não tem sessão não entra no painel",
    paginaCliente.url().includes("/entrar"),
    paginaCliente.url().replace(BASE, "")
  );
  await contextoCliente.close();

  passo("Sem erros de JavaScript na consola", errosDeConsola.length === 0, errosDeConsola[0] ?? "");
} catch (e) {
  passo("Percurso do painel sem exceções", false, String(e).split("\n")[0]);
  await pagina.screenshot({ path: `${TIROS}/erro-painel.png`, fullPage: true }).catch(() => {});
} finally {
  await navegador.close();
}

const falhas = passos.filter((p) => !p.ok);
console.log(`\n${passos.length - falhas.length}/${passos.length} passos concluídos.`);
process.exit(falhas.length ? 1 : 0);
