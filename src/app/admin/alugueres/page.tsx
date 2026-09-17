import Link from "next/link";
import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, productVariants, products, rentalReservations } from "@/db/schema";
import { BotaoLibertar, FormularioBloqueio } from "@/components/admin/GestaoAluguer";
import FormularioHigienizacao from "@/components/admin/FormularioHigienizacao";
import { COR_RESERVA, ESTADO_RESERVA } from "@/lib/labels";
import { estadoDaPeca, ESTADOS_QUE_BLOQUEIAM } from "@/lib/availability";
import { addDays, formatNumericDate, toISODay, today } from "@/lib/dates";
import { exigirAcesso } from "@/lib/guarda";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alugueres" };

export default async function PaginaAlugueres() {
  await exigirAcesso("alugueres");

  const hoje = today();

  const [reservas, pecas] = await Promise.all([
    db
      .select({
        r: rentalReservations,
        produto: products.name,
        slug: products.slug,
        tamanho: productVariants.size,
        cor: productVariants.color,
        diasHigienizacao: products.cleaningBufferDays,
        pedidoId: orders.id,
        pedidoNumero: orders.number,
        cliente: orders.customerName,
        telefone: orders.customerPhone,
      })
      .from(rentalReservations)
      .innerJoin(productVariants, eq(rentalReservations.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(orders, eq(rentalReservations.orderId, orders.id))
      .where(inArray(rentalReservations.status, ESTADOS_QUE_BLOQUEIAM))
      .orderBy(asc(rentalReservations.startDate)),

    db
      .select({
        v: productVariants,
        produto: products.name,
        slug: products.slug,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(productVariants.active, true),
          eq(products.active, true),
          gt(productVariants.rentalStock, 0)
        )
      )
      .orderBy(asc(products.name), asc(productVariants.size)),
  ]);

  // estado de cada peça, com a mesma regra que o site usa
  const estados = new Map(
    pecas.map((p) => {
      const minhas = reservas
        .filter((r) => r.r.variantId === p.v.id)
        .map((r) => ({
          startDate: r.r.startDate,
          blockUntil: r.r.blockUntil,
          status: r.r.status,
        }));
      return [p.v.id, estadoDaPeca(p.v.rentalStock, minhas)];
    })
  );

  const livres = pecas.filter((p) => estados.get(p.v.id)?.disponivel);
  const ocupadas = pecas.filter((p) => !estados.get(p.v.id)?.disponivel);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl">Alugueres e disponibilidade</h1>
        <p className="mt-1 text-sm text-tinta-70">
          {livres.length} peça(s) livre(s) · {ocupadas.length} ocupada(s). Uma peça reservada
          não aparece no site até a reserva vencer — e uma peça devolvida só reaparece no dia
          que indicar ao registar a higienização.
        </p>
      </div>

      {/* ------------------------------------------------- reservas */}
      <section>
        <h2 className="font-display text-xl">Reservas ativas</h2>
        {reservas.length === 0 ? (
          <p className="cartao mt-4 p-6 text-sm text-tinta-70">Nenhuma peça reservada.</p>
        ) : (
          <div className="cartao mt-4 overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Peça</th>
                  <th>Período do aluguer</th>
                  <th>Devolvida em</th>
                  <th>Disponível a partir de</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((linha) => {
                  const { r } = linha;
                  const atrasada = r.status === "ENTREGUE" && r.endDate.getTime() < hoje.getTime();
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link
                          href={`/produto/${linha.slug}`}
                          className="text-ouro-escuro hover:underline"
                        >
                          {linha.produto}
                        </Link>
                        <span className="block text-xs text-tinta-50">
                          Tamanho {linha.tamanho} · {linha.cor}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        {formatNumericDate(r.startDate)} → {formatNumericDate(r.endDate)}
                      </td>
                      <td className="text-xs whitespace-nowrap">
                        {r.returnedAt ? (
                          formatNumericDate(r.returnedAt)
                        ) : (
                          <span className="text-tinta-50">ainda não</span>
                        )}
                        {r.cleaningNote && (
                          <span className="block max-w-40 text-tinta-50">{r.cleaningNote}</span>
                        )}
                      </td>
                      <td className="text-xs whitespace-nowrap">
                        {formatNumericDate(addDays(r.blockUntil, 1))}
                        <span className="block text-tinta-50">
                          {r.status === "EM_HIGIENIZACAO"
                            ? "depois da higienização"
                            : "fim do bloqueio"}
                        </span>
                      </td>
                      <td>
                        {linha.cliente ?? <span className="text-tinta-50">{r.note}</span>}
                        {linha.pedidoNumero && (
                          <Link
                            href={`/admin/pedidos/${linha.pedidoId}`}
                            className="block text-xs text-ouro-escuro hover:underline"
                          >
                            {linha.pedidoNumero}
                          </Link>
                        )}
                      </td>
                      <td>
                        <span
                          className={`selo ${
                            atrasada ? "tom-rubi" : COR_RESERVA[r.status]
                          }`}
                        >
                          {atrasada ? "Em atraso" : ESTADO_RESERVA[r.status]}
                        </span>
                      </td>
                      <td>
                        {r.status === "ENTREGUE" || r.status === "EM_HIGIENIZACAO" ? (
                          <FormularioHigienizacao
                            compacto
                            dados={{
                              reservationId: r.id,
                              peca: `${linha.produto} · ${linha.tamanho} · ${linha.cor}`,
                              status: r.status,
                              fimCombinado: toISODay(r.endDate),
                              devolvidaEm: r.returnedAt ? toISODay(r.returnedAt) : null,
                              disponivelEm: toISODay(addDays(r.blockUntil, 1)),
                              cleaningNote: r.cleaningNote,
                              diasHigienizacao: linha.diasHigienizacao,
                            }}
                          />
                        ) : (
                          <BotaoLibertar reservationId={r.id} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* -------------------------------------------------- bloqueio */}
      <FormularioBloqueio
        pecas={pecas.map((p) => ({
          id: p.v.id,
          etiqueta: `${p.produto} · ${p.v.size} · ${p.v.color}`,
        }))}
      />

      {/* ---------------------------------------------- disponibilidade */}
      <section>
        <h2 className="font-display text-xl">Estado de cada peça</h2>
        <div className="cartao mt-4 overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Peça</th>
                <th>Tamanho</th>
                <th>Exemplares</th>
                <th>Estado no site</th>
              </tr>
            </thead>
            <tbody>
              {pecas.map((p) => {
                const e = estados.get(p.v.id)!;
                return (
                  <tr key={p.v.id}>
                    <td>{p.produto}</td>
                    <td>
                      {p.v.size} · {p.v.color}
                    </td>
                    <td>{p.v.rentalStock}</td>
                    <td>
                      {e.disponivel ? (
                        <span className="selo tom-verde">Disponível</span>
                      ) : (
                        <span className="selo tom-ouro">
                          Volta a {formatNumericDate(e.disponivelDe)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
