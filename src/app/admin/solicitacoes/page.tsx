import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { partners, serviceRequests } from "@/db/schema";
import { exigirAcesso } from "@/lib/guarda";
import { formatDateTime, formatNumericDate } from "@/lib/dates";
import {
  ESTADOS_DE_SOLICITACAO,
  ESTADO_SOLICITACAO,
  ROTULO_SOLICITACAO,
  TIPOS_DE_SOLICITACAO,
  type EstadoDeSolicitacao,
  type TipoDeSolicitacao,
} from "@/lib/solicitacoes-rotulos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Solicitações" };

export default async function PaginaSolicitacoes({ searchParams }: { searchParams: Promise<{ estado?: string; tipo?: string }> }) {
  await exigirAcesso("solicitacoes");
  const { estado = "", tipo = "" } = await searchParams;
  const filtroEstado = ESTADOS_DE_SOLICITACAO.includes(estado as EstadoDeSolicitacao) ? estado : "";
  const filtroTipo = TIPOS_DE_SOLICITACAO.includes(tipo as TipoDeSolicitacao) ? tipo : "";

  const condicoes = [];
  if (filtroEstado) condicoes.push(eq(serviceRequests.status, filtroEstado));
  if (filtroTipo) condicoes.push(eq(serviceRequests.type, filtroTipo));

  const [linhas, porEstado] = await Promise.all([
    db
      .select({ s: serviceRequests, parceira: partners.name })
      .from(serviceRequests)
      .leftJoin(partners, eq(serviceRequests.partnerId, partners.id))
      .where(condicoes.length ? and(...condicoes) : undefined)
      .orderBy(desc(serviceRequests.createdAt))
      .limit(200),
    db.select({ estado: serviceRequests.status, n: count() }).from(serviceRequests).groupBy(serviceRequests.status),
  ]);
  const contagem = new Map(porEstado.map((e) => [e.estado, e.n]));

  const ligacao = (e: string, t: string) => {
    const q = new URLSearchParams();
    if (e) q.set("estado", e);
    if (t) q.set("tipo", t);
    const s = q.toString();
    return s ? `/admin/solicitacoes?${s}` : "/admin/solicitacoes";
  };

  return (
    <div>
      <h1 className="font-display text-2xl">Solicitações</h1>
      <p className="mt-1 text-sm text-tinta-70">Pedidos de maquilhagem e de sapatos feitos pelas clientes, sozinhos ou junto com uma encomenda.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={ligacao("", filtroTipo)} className="chip" aria-current={!filtroEstado ? "true" : undefined}>
          Todas
        </Link>
        {ESTADOS_DE_SOLICITACAO.map((e) => (
          <Link key={e} href={ligacao(e, filtroTipo)} className="chip" aria-current={filtroEstado === e ? "true" : undefined}>
            {ESTADO_SOLICITACAO[e].label} <span className="num ml-1 text-tinta-50">{contagem.get(e) ?? 0}</span>
          </Link>
        ))}
        <span className="mx-2 w-px self-stretch bg-marfim-200" aria-hidden="true" />
        {TIPOS_DE_SOLICITACAO.map((t) => (
          <Link key={t} href={ligacao(filtroEstado, filtroTipo === t ? "" : t)} className="chip" aria-current={filtroTipo === t ? "true" : undefined}>
            {ROTULO_SOLICITACAO[t]}
          </Link>
        ))}
      </div>

      {linhas.length === 0 ? (
        <p className="cartao mt-6 p-8 text-center text-sm text-tinta-70">Sem solicitações com estes filtros.</p>
      ) : (
        <div className="cartao mt-6 overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Dia do evento</th>
                <th>Estado</th>
                <th>Recebida</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ s, parceira }) => {
                const e = ESTADO_SOLICITACAO[s.status as EstadoDeSolicitacao] ?? ESTADO_SOLICITACAO.NOVO;
                return (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/admin/solicitacoes/${s.id}`} className="num font-medium hover:text-ouro-escuro">
                        {s.code}
                      </Link>
                    </td>
                    <td>
                      {ROTULO_SOLICITACAO[s.type as TipoDeSolicitacao] ?? s.type}
                      {parceira && <span className="block text-xs text-tinta-50">{parceira}</span>}
                    </td>
                    <td>
                      {s.customerName}
                      <span className="block text-xs text-tinta-50">{s.customerPhone}</span>
                    </td>
                    <td className="num whitespace-nowrap">{s.eventDate ? formatNumericDate(s.eventDate) : "—"}</td>
                    <td>
                      <span className={`selo ${e.cor}`}>{e.label}</span>
                    </td>
                    <td className="num text-xs whitespace-nowrap">{formatDateTime(s.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
