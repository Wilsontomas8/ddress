import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __wilPool: Pool | undefined;
};

function criarPool() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL em falta. Copie .env.example para .env e preencha a ligação à base de dados."
    );
  }
  return new Pool({
    connectionString: url,
    // Serviços geridos (Neon, Supabase, Railway) exigem TLS.
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
    max: 10,
  });
}

const pool = globalForDb.__wilPool ?? criarPool();
if (process.env.NODE_ENV !== "production") globalForDb.__wilPool = pool;

export const db = drizzle(pool, { schema });
export { schema, pool };
