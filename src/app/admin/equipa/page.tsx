import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import FormularioFuncionario from "@/components/admin/FormularioFuncionario";
import { PAPEL } from "@/lib/labels";
import { formatNumericDate } from "@/lib/dates";
import { exigirAcesso } from "@/lib/guarda";

export const dynamic = "force-dynamic";
export const metadata = { title: "Equipa" };

export default async function PaginaEquipa() {
  await exigirAcesso("equipa");


  const equipa = await db
    .select()
    .from(users)
    .where(inArray(users.role, ["FUNCIONARIO", "ADMIN"]))
    .orderBy(asc(users.name));

  return (
    <div className="max-w-5xl space-y-10">
      <div>
        <h1 className="font-display text-2xl">Equipa</h1>
        <p className="mt-1 text-sm text-tinta-70">
          Quem tem acesso ao painel. Os funcionários tratam de pedidos, provas e catálogo; os
          administradores também mexem nas definições e nas contas.
        </p>
      </div>

      <section className="cartao overflow-x-auto">
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Papel</th>
              <th>Desde</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {equipa.map((u) => (
              <tr key={u.id} className={u.active ? "" : "opacity-50"}>
                <td className="font-medium">{u.name}</td>
                <td className="text-xs">{u.email}</td>
                <td className="text-xs">{u.phone ?? "—"}</td>
                <td className="text-xs">{PAPEL[u.role]}</td>
                <td className="text-xs">{formatNumericDate(u.createdAt)}</td>
                <td>
                  {u.active ? (
                    <span className="selo bg-emerald-100 text-emerald-900">Ativa</span>
                  ) : (
                    <span className="selo bg-marfim-200 text-tinta-70">Suspensa</span>
                  )}
                </td>
                <td>
                  <FormularioFuncionario
                    conta={{
                      id: u.id,
                      name: u.name,
                      email: u.email,
                      phone: u.phone,
                      role: u.role,
                      active: u.active,
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="cartao p-5">
        <h2 className="font-display text-lg">Nova conta de acesso</h2>
        <p className="mt-1 mb-4 text-sm text-tinta-70">
          Crie a conta e entregue a palavra-passe ao funcionário; ele pode usá-la para entrar em{" "}
          /entrar.
        </p>
        <FormularioFuncionario />
      </section>
    </div>
  );
}
