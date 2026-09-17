import Link from "next/link";
import { asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { appointments, orders, users } from "@/db/schema";
import { formatKz } from "@/lib/money";
import { formatNumericDate } from "@/lib/dates";
import { exigirAcesso } from "@/lib/guarda";
import { esperasPorTratar, listarNewsletter } from "@/lib/espera";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes" };

export default async function PaginaClientes() {
  await exigirAcesso("clientes");
  const [esperas, newsletter] = await Promise.all([esperasPorTratar(50), listarNewsletter()]);

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

      {/* --------------------------------------- à espera de uma peça */}
      <section className="mt-12">
        <h2 className="font-display text-lg">À espera de uma peça</h2>
        <p className="mt-1 text-sm text-tinta-70">
          Pedidos de “avise-me quando estiver livre”. O aviso sai sozinho na tarefa diária, por e-mail, quando a peça volta.
        </p>
        {esperas.length === 0 ? (
          <p className="cartao mt-4 p-6 text-sm text-tinta-50">Ninguém à espera de momento.</p>
        ) : (
          <div className="cartao mt-4 overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Peça</th>
                  <th>Cliente</th>
                  <th>Contactos</th>
                  <th>Precisa a partir de</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {esperas.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/produto/${e.slug}`} target="_blank" className="hover:text-ouro-escuro">
                        {e.peca}
                      </Link>
                    </td>
                    <td>{e.nome}</td>
                    <td className="text-xs">
                      <span className="num block">{e.telefone}</span>
                      {e.email && <span className="block text-tinta-50">{e.email}</span>}
                    </td>
                    <td className="num text-xs">{e.desde ? formatNumericDate(e.desde) : "—"}</td>
                    <td>
                      {e.avisadoEm ? (
                        <span className="selo tom-verde">Avisada {formatNumericDate(e.avisadoEm)}</span>
                      ) : (
                        <span className="selo tom-ouro">À espera</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* --------------------------------------- newsletter */}
      <section className="mt-12">
        <h2 className="font-display text-lg">Newsletter</h2>
        <p className="mt-1 text-sm text-tinta-70">
          {newsletter.filter((n) => !n.unsubscribedAt).length} pessoas autorizaram receber novidades. Cada e-mail traz a ligação
          de saída; quem sai fica registado e não volta a ser contactado.
        </p>
        {newsletter.length > 0 && (
          <div className="cartao mt-4 overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Autorizou em</th>
                  <th>Origem</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {newsletter.map((n) => (
                  <tr key={n.id}>
                    <td className="text-sm">{n.email}</td>
                    <td className="num text-xs">{formatNumericDate(n.consentAt)}</td>
                    <td className="text-xs text-tinta-50">{n.source}</td>
                    <td>
                      {n.unsubscribedAt ? (
                        <span className="selo tom-neutro">Saiu</span>
                      ) : (
                        <span className="selo tom-verde">Activa</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
