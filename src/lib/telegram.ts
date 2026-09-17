import "server-only";

/**
 * Avisos da loja no Telegram — o caminho mais rápido para a equipa saber de
 * um pedido novo enquanto não há WhatsApp Business API.
 *
 *   TELEGRAM_BOT_TOKEN  — dado pelo @BotFather
 *   TELEGRAM_CHAT_ID    — o grupo (ou pessoa) que recebe os avisos
 *
 * Sem estas variáveis, o aviso fica registado como SEM_CONFIGURACAO, tal
 * como o e-mail: nada falha.
 */

export type ResultadoDoTelegram = { ok: true } | { ok: false; semConfiguracao: boolean; erro: string };

export function telegramConfigurado(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function enviarTelegram(titulo: string, corpo: string, ligacao?: string | null): Promise<ResultadoDoTelegram> {
  if (!telegramConfigurado()) {
    return { ok: false, semConfiguracao: true, erro: "Telegram por configurar." };
  }

  const texto = [`*${titulo}*`, corpo, ligacao ?? ""].filter(Boolean).join("\n\n");
  try {
    const resposta = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: texto,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => "");
      return { ok: false, semConfiguracao: false, erro: `Telegram respondeu ${resposta.status}: ${detalhe.slice(0, 160)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, semConfiguracao: false, erro: e instanceof Error ? e.message : "Erro ao falar com o Telegram." };
  }
}
