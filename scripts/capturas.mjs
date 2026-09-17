/**
 * Capturas de página inteira em telemóvel, tablet e computador, com
 * verificação de transbordo horizontal.
 *
 *   node scripts/capturas.mjs [url-base] [pasta] [rota ...]
 *
 * Usa o Chromium do Playwright se existir; senão, o Edge ou o Chrome
 * instalados no sistema.
 */

import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3100";
const PASTA = process.argv[3] ?? ".capturas";
const ROTAS = process.argv.slice(4).length ? process.argv.slice(4) : ["/"];
const SO_ECRA = process.env.SO_ECRA === "1";
const LARGURAS = (process.env.LARGURAS ?? "390,768,1360").split(",").map(Number);

mkdirSync(PASTA, { recursive: true });

async function abrirNavegador() {
  try {
    return await chromium.launch();
  } catch {
    for (const channel of ["msedge", "chrome"]) {
      try {
        return await chromium.launch({ channel });
      } catch {}
    }
    throw new Error("Nenhum navegador disponível para o Playwright.");
  }
}

const navegador = await abrirNavegador();
let falhas = 0;

for (const largura of LARGURAS) {
  const contexto = await navegador.newContext({
    viewport: { width: largura, height: largura < 700 ? 844 : 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const pagina = await contexto.newPage();
  for (const rota of ROTAS) {
    await pagina.goto(BASE + rota, { waitUntil: "networkidle" });
    // Desce a página para carregar imagens com loading="lazy"
    await pagina.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await pagina.waitForTimeout(700);
    const transbordo = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const nome = `${rota.replace(/[^\w]+/g, "_").replace(/^_|_$/g, "") || "inicio"}-${largura}.png`;
    await pagina.screenshot({ path: path.join(PASTA, nome), fullPage: !SO_ECRA });
    const ok = transbordo <= 0;
    if (!ok) falhas++;
    console.log(`${ok ? "  ok  " : " FALHA"} ${rota} @${largura}px${ok ? "" : ` — transborda ${transbordo}px`} → ${nome}`);
  }
  await contexto.close();
}

await navegador.close();
process.exitCode = falhas ? 1 : 0;
