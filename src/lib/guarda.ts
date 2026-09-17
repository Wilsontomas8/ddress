import "server-only";
import { redirect } from "next/navigation";
import { getUtilizador } from "./auth";
import { paginaInicialDaMatriz, podeEditarNa, podeVerNa, type Seccao } from "./permissoes";
import { matrizDoPerfil } from "./permissoes-servidor";

/**
 * Porteiro das páginas do painel.
 *
 * Quem não tem sessão vai para a autenticação; quem tem sessão mas não
 * pode ver aquela secção é levado para a primeira página do seu próprio
 * perfil, em vez de ver um erro. Devolve também se pode editar, para a
 * página esconder os formulários (o servidor volta a validar ao gravar).
 */
export async function exigirAcesso(seccao: Seccao) {
  const utilizador = await getUtilizador();
  if (!utilizador) redirect("/entrar?destino=/admin");
  const matriz = await matrizDoPerfil(utilizador.role);
  if (!podeVerNa(matriz, seccao)) {
    redirect(paginaInicialDaMatriz(matriz));
  }
  return Object.assign(utilizador, { podeEditar: podeEditarNa(matriz, seccao), matriz });
}
