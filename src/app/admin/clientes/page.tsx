import Link from "next/link";
import { asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { appointments, orders, users } from "@/db/schema";
import { formatKz } from "@/lib/money";
import { formatNumericDate } from "@/lib/dates";
import { exigirAcesso } from "@/lib/guarda";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes" };

export default async function PaginaClientes() {
  await exigirAcesso("clientes");

  const [clientes, todosPedidos, todasMarcacoes] = await Promise.all([
    db.select().from(users).where(eq(users.role, "CLIENTE")).orderBy(asc(users.name)),
    db.select().from(orders).orderBy(desc(orders.createdAt)),
    db.select().from(appointments),
  ]);

  // Clientes que compraram sem criar conta (só telefone)
  const semConta = todosPedidos.filter((p) => !p.userId);
  const telefonesSemConta = [...new Set(semConta.map((p) => p.customerPhone))];

  const faturadoValido = ["PAGO", "PRONTO", "ENTREGUE", "EM_ALUGUER", "DEVOLVIDO", "CONCLUIDO"];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl">Clientes</h1>
        <p className="mt-1 text-sm text-tinta-70">
          {clientes.length} com conta · {telefonesSemConta.length} que compraram sem criar conta
        </p>
      </div>

      <section>
        <h2 className="font-display text-xl">Com conta</h2>
        {clientes.length === 0 ? (
          <p className="cartao mt-4 p-6 text-sm text-tinta-70">Ainda não há contas de cliente.</p>
        ) : (
          <div className="cartao mt-4 overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contacto</th>
                  <th>Pedidos</th>
                  <th>Provas</th>
                  <th>Último pedido</th>
                  <th className="text-right">Total gasto</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => {
                  const meus = todosPedidos.filter((p) => p.userId === c.id);
                  const gasto = meus
                    .filter((p) => faturadoValido.includes(p.status))
                    .reduce((t, p) => t + p.total - p.depositTotal, 0);
                  const provas = todasMarcacoes.filter((m) => m.userId === c.id).length;
                  const ultimo = meus[0];

                  return (
                    <tr key={c.id}>
                      <td className="font-medium">{c.name}</td>
                      <td className="text-xs">
                        {c.phone ?? "—"}
                        <span className="block text-tinta-50">{c.email}</span>
                      </td>
                      <td>{meus.length}</td>
                      <td>{provas}</td>
                      <td className="text-xs whitespace-nowrap">
                        {ultimo ? (
                          <Link
                            href={`/admin/pedidos/${ultimo.id}`}
                            className="text-ouro-escuro hover:underline"
                          >
                            {ultimo.number}
                          </Link>
                        ) : (
                          "—"
                        )}
                        {ultimo && (
                          <span className="block text-tinta-50">
                            {formatNumericDate(ultimo.createdAt)}
                          </span>
                        )}
                      </td>
                      <td className="text-right whitespace-nowrap">{formatKz(gasto)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {telefonesSemConta.length > 0 && (
        <section>
          <h2 className="font-display text-xl">Sem conta</h2>
          <p className="mt-1 text-sm text-tinta-70">
            Pedidos feitos sem registo. Identificamos pelo telefone.
          </p>
          <div className="cartao mt-4 overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Pedidos</th>
                  <th>Último</th>
                </tr>
              </thead>
              <tbody>
                {telefonesSemConta.map((tel) => {
                  const deles = semConta.filter((p) => p.customerPhone === tel);
                  const ultimo = deles[0];
                  return (
                    <tr key={tel}>
                      <td className="font-medium">{ultimo.customerName}</td>
                      <td className="text-xs">{tel}</td>
                      <td>{deles.length}</td>
                      <td className="text-xs">
                        <Link
                          href={`/admin/pedidos/${ultimo.id}`}
                          className="text-ouro-escuro hover:underline"
                        >
                          {ultimo.number}
                        </Link>
                        <span className="block text-tinta-50">
                          {formatNumericDate(ultimo.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
