/**
 * Capturas de página inteira em telemóvel, tablet e computador, com
 * verificação de transbordo horizontal.
 *
 *   node scripts/capturas.mjs [url-base] [pasta] [rota ...]
 *
 *   ENTRAR="admin@ddress.ao:admin123" — inicia sessão antes das capturas
 *
 * Usa o Chromium do Playwright se existir; senão, o Edge ou o Chrome
 * instalados no sistema.
 */

import { abrirNavegador } from "./navegador.mjs";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3100";
const PASTA = process.argv[3] ?? ".capturas";
const ROTAS = process.argv.slice(4).length ? process.argv.slice(4) : ["/"];
const SO_ECRA = process.env.SO_ECRA === "1";
const LARGURAS = (process.env.LARGURAS ?? "390,768,1360").split(",").map(Number);

mkdirSync(PASTA, { recursive: true });


const navegador = await abrirNavegador();
let falhas = 0;

for (const largura of LARGURAS) {
  const contexto = await navegador.newContext({
    viewport: { width: largura, height: largura < 700 ? 844 : 900 },
    deviceScaleFactor: 1,
    reducedMotion: process.env.MOVIMENTO ? "no-preference" : "reduce",
  });
  if (process.env.ENTRAR) {
    const [email, password] = process.env.ENTRAR.split(":");
    const r = await contexto.request.post(BASE + "/api/auth/entrar", { data: { email, password } });
    if (!r.ok()) throw new Error(`Não foi possível entrar como ${email}: ${r.status()}`);
  }
  const pagina = await contexto.newPage();
  for (const rota of ROTAS) {
    // "load" e não "networkidle": as páginas com vídeo a correr nunca ficam
    // sem pedidos de rede.
    await pagina.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 90000 });
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
