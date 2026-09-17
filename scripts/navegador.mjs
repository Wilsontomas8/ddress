import { chromium } from "playwright";

/**
 * Abre um Chromium para os testes de percurso e as capturas.
 * Usa o do Playwright se estiver instalado (npx playwright install chromium);
 * senão, o Edge ou o Chrome do sistema.
 */
export async function abrirNavegador() {
  try {
    return await chromium.launch();
  } catch {
    for (const channel of ["msedge", "chrome"]) {
      try {
        return await chromium.launch({ channel });
      } catch {}
    }
    throw new Error("Nenhum navegador disponível: corra `npx playwright install chromium`.");
  }
}
