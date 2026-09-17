import "server-only";
import { redirect } from "next/navigation";
import { getUtilizador } from "./auth";
import { paginaInicialDoPerfil, podeVer, type Seccao } from "./permissoes";

/**
 * Porteiro das páginas do painel.
 *
 * Quem não tem sessão vai para a autenticação; quem tem sessão mas não
 * tem acesso àquela secção é levado para a primeira página do seu
 * próprio perfil, em vez de ver um erro.
 */
export async function exigirAcesso(seccao: Seccao) {
  const utilizador = await getUtilizador();
  if (!utilizador) redirect("/entrar?destino=/admin");
  if (!podeVer(utilizador.role, seccao)) {
    redirect(paginaInicialDoPerfil(utilizador.role));
  }
  return utilizador;
}
