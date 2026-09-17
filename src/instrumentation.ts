/**
 * Corre uma vez no arranque do servidor, antes de qualquer pedido.
 * Na Fase 1 garante que a base embutida existe e tem dados.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prepararBaseDeDados } = await import("./db/preparar");
    await prepararBaseDeDados();
  }
}
