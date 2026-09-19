/**
 * Olha para a DATABASE_URL / POSTGRES_URL e aponta os enganos mais comuns,
 * sem nunca devolver a palavra-passe nem o seu tamanho.
 */
export function avisosDaLigacao(url: string | undefined): string[] {
  if (!url) return [];
  const avisos: string[] = [];
  let e: URL;
  try {
    e = new URL(url);
  } catch {
    return ["O endereço não é um URL válido: copie-o outra vez do botão Connect do Supabase."];
  }

  const utilizador = decodeURIComponent(e.username);
  const senha = e.password;

  if (/YOUR-PASSWORD/i.test(url)) {
    avisos.push("A ligação ainda tem o texto YOUR-PASSWORD: substitua [YOUR-PASSWORD] inteiro pela palavra-passe da base.");
  } else if (/[[\]]|%5B|%5D/i.test(url)) {
    avisos.push("A palavra-passe foi colada mas ficaram os parênteses rectos [ ] à volta dela: apague-os.");
  }
  if (!senha) avisos.push("A ligação não tem palavra-passe.");
  if (e.hostname.includes("pooler.supabase.com") && !/^postgres\.[a-z0-9]{15,}$/.test(utilizador)) {
    avisos.push('No pooler do Supabase o utilizador tem de ser "postgres.<referência do projecto>", não só "postgres".');
  }
  if (/[@#/?:]/.test(decodeURIComponent(senha)) && !/%[0-9A-F]{2}/i.test(senha)) {
    avisos.push("A palavra-passe tem caracteres especiais (@ # / ? :): gere uma nova só com letras e números.");
  }
  return avisos;
}
