/**
 * Ligações "clique para conversar" do WhatsApp (wa.me), com a mensagem já
 * escrita. Não precisam de conta de API: abrem o WhatsApp de quem clica.
 * O envio automático (WhatsApp Business Cloud API) é da Fase 2.
 */

export function numeroWhatsApp(telefone: string | null | undefined): string {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (!digitos) return "";
  // Números angolanos escritos sem indicativo (9 dígitos a começar por 9)
  return digitos.length === 9 && digitos.startsWith("9") ? `244${digitos}` : digitos;
}

export function ligacaoWhatsApp(telefone: string | null | undefined, mensagem?: string): string | null {
  const numero = numeroWhatsApp(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;
}
