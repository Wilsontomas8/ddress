import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, orders, partners, serviceRequestProducts, serviceRequests, users } from "@/db/schema";
import { exigirAcesso } from "@/lib/guarda";
import { formatDateTime, formatLongDate } from "@/lib/dates";
import { pecasParaEscolher } from "@/lib/conteudos";
import { ligacaoWhatsApp } from "@/lib/whatsapp";
import {
  ESTADO_SOLICITACAO,
  PROXIMOS_ESTADOS_SOLICITACAO,
  ROTULO_SOLICITACAO,
  type EstadoDeSolicitacao,
  type TipoDeSolicitacao,
} from "@/lib/solicitacoes-rotulos";
import { guardarNotaSolicitacao, mudarEstadoSolicitacao, reenviarAvisosSolicitacao, sugerirSapatos } from "@/app/admin/acoes-conteudos";
import { ESTADO_AVISO, PUBLICO_AVISO } from "@/lib/avisos-rotulos";
import FormularioAccao from "@/components/admin/FormularioAccao";
import BotaoAccao from "@/components/admin/BotaoAccao";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [s] = await db.select({ code: serviceRequests.code }).from(serviceRequests).where(eq(serviceRequests.id, id));
  return { title: s?.code ?? "Solicitação" };
}

export default async function PaginaSolicitacao({ params }: { params: Promise<{ id: string }> }) {
  const eu = await exigirAcesso("solicitacoes");
  const { id } = await params;

  const [linha] = await db
    .select({ s: serviceRequests, parceira: partners, pedido: { id: orders.id, number: orders.number }, tratadaPor: users.name })
    .from(serviceRequests)
    .leftJoin(partners, eq(serviceRequests.partnerId, partners.id))
    .leftJoin(orders, eq(serviceRequests.orderId, orders.id))
    .leftJoin(users, eq(serviceRequests.handledById, users.id))
    .where(eq(serviceRequests.id, id));
  if (!linha) notFound();
  const { s, parceira, pedido, tratadaPor } = linha;

  const [ligados, avisos, sapatos] = await Promise.all([
    db.select().from(serviceRequestProducts).where(eq(serviceRequestProducts.requestId, id)),
    db.select().from(notifications).where(eq(notifications.requestId, id)).orderBy(desc(notifications.createdAt)),
    s.type === "SAPATOS" ? pecasParaEscolher({ soSapatos: true }) : Promise.resolve([]),
  ]);
  const todas = s.type === "SAPATOS" ? sapatos : [];
  const nomeDe = new Map(todas.map((p) => [p.id, p]));
  const daCliente = ligados.filter((l) => l.source === "CLIENTE");
  const daLoja = ligados.filter((l) => l.source === "LOJA").map((l) => l.productId);

  const estado = ESTADO_SOLICITACAO[s.status as EstadoDeSolicitacao] ?? ESTADO_SOLICITACAO.NOVO;
  const proximos = PROXIMOS_ESTADOS_SOLICITACAO[s.status as EstadoDeSolicitacao] ?? [];
  const tipo = ROTULO_SOLICITACAO[s.type as TipoDeSolicitacao] ?? s.type;
  const primeiroNome = s.customerName.split(" ")[0];

  const whatsCliente = ligacaoWhatsApp(s.customerPhone, `Olá ${primeiroNome}! Somos a DDRESS, sobre o seu pedido de ${tipo.toLowerCase()} ${s.code}.`);
  const whatsParceira = parceira
    ? ligacaoWhatsApp(
        parceira.whatsapp,
        `Olá ${parceira.name}! A DDRESS tem uma cliente para maquilhagem (${s.code}): ${s.customerName}, ${s.customerPhone}${s.eventDate ? `, dia ${formatLongDate(s.eventDate)}` : ""}${s.eventTime ? ` às ${s.eventTime}` : ""}${s.location ? `, em ${s.location}` : ""}.`
      )
    : null;

  return (
    <div className="max-w-5xl">
      <nav className="text-xs text-tinta-50">
        <Link href="/admin/solicitacoes" className="hover:text-ouro-escuro">
          Solicitações
        </Link>
        <span className="mx-1.5">/</span>
        <span className="num">{s.code}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="num font-display text-2xl">{s.code}</h1>
        <span className={`selo ${estado.cor}`}>{estado.label}</span>
        <span className="text-sm text-tinta-50">
          {tipo} · recebida {formatDateTime(s.createdAt)}
          {tratadaPor ? ` · tratada por ${tratadaPor}` : ""}
        </span>
      </div>

      {eu.podeEditar && proximos.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {proximos.map((p) => (
            <BotaoAccao
              key={p}
              acao={mudarEstadoSolicitacao.bind(null, s.id, p)}
              confirmar={p === "CANCELADO" ? "Cancelar esta solicitação?" : undefined}
              className={p === "CANCELADO" ? "btn btn-perigo" : "btn btn-contorno"}
            >
              Marcar como {ESTADO_SOLICITACAO[p].label.toLowerCase()}
            </BotaoAccao>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section className="cartao p-5">
            <h2 className="font-display text-lg">Cliente</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="etiqueta">Nome</dt>
                <dd>{s.customerName}</dd>
              </div>
              <div>
                <dt className="etiqueta">Telefone</dt>
                <dd className="num">{s.customerPhone}</dd>
              </div>
              <div>
                <dt className="etiqueta">E-mail</dt>
                <dd>{s.customerEmail || "—"}</dd>
              </div>
              {pedido?.id && (
                <div>
                  <dt className="etiqueta">Encomenda</dt>
                  <dd>
                    <Link href={`/admin/pedidos/${pedido.id}`} className="num text-ouro-escuro hover:underline">
                      {pedido.number}
                    </Link>
                  </dd>
                </div>
              )}
              {s.eventDate && (
                <div>
                  <dt className="etiqueta">Dia do evento</dt>
                  <dd>
                    {formatLongDate(s.eventDate)}
                    {s.eventTime ? ` às ${s.eventTime}` : ""}
                  </dd>
                </div>
              )}
              {s.location && (
                <div>
                  <dt className="etiqueta">Local</dt>
                  <dd>{s.location}</dd>
                </div>
              )}
              {s.shoeSize && (
                <div>
                  <dt className="etiqueta">Tamanho</dt>
                  <dd className="num">{s.shoeSize}</dd>
                </div>
              )}
              {parceira && (
                <div>
                  <dt className="etiqueta">Parceira</dt>
                  <dd>{parceira.name}</dd>
                </div>
              )}
              {s.notes && (
                <div className="sm:col-span-2">
                  <dt className="etiqueta">O que a cliente escreveu</dt>
                  <dd className="whitespace-pre-line">{s.notes}</dd>
                </div>
              )}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {whatsCliente && (
                <a href={whatsCliente} target="_blank" rel="noreferrer" className="btn btn-principal">
                  WhatsApp da cliente
                </a>
              )}
              {whatsParceira && (
                <a href={whatsParceira} target="_blank" rel="noreferrer" className="btn btn-contorno">
                  Enviar à {parceira?.name}
                </a>
              )}
            </div>
          </section>

          {s.type === "SAPATOS" && (
            <section className="cartao p-5">
              <h2 className="font-display text-lg">Sapatos</h2>
              <p className="etiqueta mt-4">Escolhidos pela cliente</p>
              {daCliente.length === 0 ? (
                <p className="text-sm text-tinta-50">Nenhum — a cliente pediu sugestões.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-3">
                  {daCliente.map((l) => {
                    const p = nomeDe.get(l.productId);
                    return (
                      <li key={l.productId} className="flex w-40 items-center gap-2 text-sm">
                        {p?.imagem && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imagem} alt="" className="h-12 w-12 object-cover" />
                        )}
                        {p?.name ?? "Peça removida"}
                      </li>
                    );
                  })}
                </ul>
              )}

              <FormularioAccao acao={sugerirSapatos} podeEditar={eu.podeEditar} textoBotao="Guardar sugestões" botaoClassName="btn btn-contorno" className="mt-6 space-y-4 border-t border-marfim-200 pt-5">
                <input type="hidden" name="id" value={s.id} />
                <p className="etiqueta">Sugestões da loja</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {todas.map((p) => (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-3 border border-marfim-200 p-2 has-[:checked]:border-ouro">
                        <input type="checkbox" name="produtos" value={p.id} defaultChecked={daLoja.includes(p.id)} />
                        {p.imagem && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imagem} alt="" className="h-10 w-10 object-cover" />
                        )}
                        <span className="text-sm">{p.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </FormularioAccao>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="cartao p-5">
            <h2 className="font-display text-lg">Nota interna</h2>
            <FormularioAccao acao={guardarNotaSolicitacao} podeEditar={eu.podeEditar} botaoClassName="btn btn-contorno" className="mt-3 space-y-3">
              <input type="hidden" name="id" value={s.id} />
              <textarea name="staffNote" className="campo min-h-28" defaultValue={s.staffNote ?? ""} aria-label="Nota interna" />
            </FormularioAccao>
          </section>

          <section className="cartao p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg">Avisos</h2>
              {eu.podeEditar && (
                <BotaoAccao acao={reenviarAvisosSolicitacao.bind(null, s.id)} className="text-xs text-ouro-escuro hover:underline">
                  Reenviar e-mails
                </BotaoAccao>
              )}
            </div>
            {avisos.length === 0 ? (
              <p className="mt-3 text-sm text-tinta-50">Sem avisos.</p>
            ) : (
              <ul className="mt-3 space-y-3 text-sm">
                {avisos.map((a) => {
                  const e = ESTADO_AVISO[a.status] ?? { texto: a.status, cor: "tom-neutro" };
                  return (
                    <li key={a.id} className="border-b border-marfim-200 pb-2 last:border-0">
                      <span className="block text-xs text-tinta-50">
                        {PUBLICO_AVISO[a.audience] ?? a.audience} · {a.channel === "EMAIL" ? `e-mail ${a.recipient ?? ""}` : "no site"}
                      </span>
                      <span className="block">{a.title}</span>
                      {a.channel === "EMAIL" && <span className={`selo mt-1 ${e.cor}`}>{e.texto}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
