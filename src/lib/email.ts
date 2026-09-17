import "server-only";
import nodemailer from "nodemailer";

/**
 * Envio de e-mail. Dois caminhos, ambos por variáveis de ambiente:
 *
 *  · SMTP (ex.: Gmail da loja com "palavra-passe de aplicação"):
 *      SMTP_HOST=smtp.gmail.com  SMTP_PORT=465
 *      SMTP_USER=atendimentoddress@gmail.com  SMTP_PASS=<palavra-passe de aplicação>
 *  · Resend:  RESEND_API_KEY
 *
 * Sem nenhum configurado, o aviso fica registado no site com o estado
 * SEM_CONFIGURACAO — nada falha para o cliente.
 */

export type ResultadoDoEnvio = { ok: true } | { ok: false; semConfiguracao: boolean; erro: string };

const REMETENTE = () => process.env.EMAIL_REMETENTE || "DDRESS <atendimentoddress@gmail.com>";

export function emailConfigurado(): boolean {
  return !!(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));
}

function html(texto: string, ligacao?: string | null): string {
  const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragrafos = escapar(texto)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  const botao = ligacao
    ? `<p style="margin:24px 0"><a href="${ligacao}" style="background:#c9a33a;color:#0a0a0a;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Abrir no site</a></p>`
    : "";
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#fbf8f2;padding:32px"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e7dfcf;padding:32px;color:#14120f"><p style="font-family:Georgia,serif;font-size:22px;letter-spacing:.2em;color:#85660f;margin:0 0 24px">DDRESS</p>${paragrafos}${botao}<p style="margin:28px 0 0;font-size:12px;color:#6e6757">DDRESS — Aluguer e venda de vestidos · Luanda</p></div></div>`;
}

export async function enviarEmail(opts: {
  para: string;
  assunto: string;
  texto: string;
  ligacao?: string | null;
}): Promise<ResultadoDoEnvio> {
  if (!emailConfigurado()) {
    return { ok: false, semConfiguracao: true, erro: "Envio de e-mail não configurado." };
  }
  const corpoHtml = html(opts.texto, opts.ligacao);
  const corpoTexto = opts.ligacao ? `${opts.texto}\n\n${opts.ligacao}` : opts.texto;

  try {
    if (process.env.RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: REMETENTE(), to: [opts.para], subject: opts.assunto, text: corpoTexto, html: corpoHtml }),
      });
      if (!r.ok) return { ok: false, semConfiguracao: false, erro: `Resend respondeu ${r.status}` };
      return { ok: true };
    }

    const porta = Number(process.env.SMTP_PORT || 465);
    const transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: porta,
      secure: porta === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporte.sendMail({ from: REMETENTE(), to: opts.para, subject: opts.assunto, text: corpoTexto, html: corpoHtml });
    return { ok: true };
  } catch (e) {
    return { ok: false, semConfiguracao: false, erro: e instanceof Error ? e.message.slice(0, 200) : "Falha no envio." };
  }
}
