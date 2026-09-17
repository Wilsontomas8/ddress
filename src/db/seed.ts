/**
 * Volta a encher a base de dados com os dados de demonstração.
 *
 *   npm run db:seed
 *
 * CUIDADO: apaga o conteúdo das tabelas.
 */

import "dotenv/config";
import { db, fecharBaseDeDados } from "./index";
import { prepararBaseDeDados } from "./preparar";
import { semear } from "./semente";

async function main() {
  await prepararBaseDeDados();
  await semear(db);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => fecharBaseDeDados());
