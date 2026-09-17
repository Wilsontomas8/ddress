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

/**
 * Espera que o React tome conta do elemento. Sem isto, um clique dado logo
 * a seguir ao HTML chegar é tratado à moda antiga (o formulário recarrega a
 * página) e o percurso falha sem razão aparente.
 */
export async function hidratado(pagina, seletor = "form") {
  await pagina.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return !!el && Object.keys(el).some((k) => k.startsWith("__react"));
    },
    seletor,
    { timeout: 90000 }
  );
}
