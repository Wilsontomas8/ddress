import Link from "next/link";
import { and, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { exigirAcesso } from "@/lib/guarda";
import { formatDateTime } from "@/lib/dates";
import { emailConfigurado } from "@/lib/email";
import { ESTADO_AVISO, PUBLICO_AVISO } from "@/lib/avisos-rotulos";
import { marcarNotificacaoLida, marcarTodasLidas } from "@/app/admin/acoes-conteudos";
import BotaoAccao from "@/components/admin/BotaoAccao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notificações" };

const VISTAS = [
  { valor: "", texto: "Da loja" },
  { valor: "por-ler", texto: "Por ler" },
  { valor: "emails", texto: "E-mails enviados" },
];

export default async function PaginaNotificacoes({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  await exigirAcesso("notificacoes");
  const { vista = "" } = await searchParams;

  let onde: SQL | undefined;
  if (vista === "emails") onde = eq(notifications.channel, "EMAIL");
  else if (vista === "por-ler") onde = and(eq(notifications.audience, "LOJA"), eq(notifications.channel, "SITE"), isNull(notifications.readAt));
  else onde = and(eq(notifications.channel, "SITE"), inArray(notifications.audience, ["LOJA"]));

  const avisos = await db.select().from(notifications).where(onde).orderBy(desc(notifications.createdAt)).limit(150);
  const semEmail = !emailConfigurado();

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Notificações</h1>
          <p className="mt-1 text-sm text-tinta-70">Novos pedidos, mudanças de estado e solicitações — e os e-mails enviados às clientes e parceiras.</p>
        </div>
        <BotaoAccao acao={marcarTodasLidas}>Marcar todas como lidas</BotaoAccao>
      </div>

      {semEmail && (
        <p className="cartao mt-6 border-l-2 border-l-ouro p-4 text-sm text-tinta-70">
          O envio de e-mails ainda não está configurado. Os avisos no site funcionam; os e-mails ficam registados como “por configurar” e podem ser reenviados depois.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {VISTAS.map((v) => (
          <Link key={v.valor || "loja"} href={v.valor ? `/admin/notificacoes?vista=${v.valor}` : "/admin/notificacoes"} className="chip" aria-current={vista === v.valor ? "true" : undefined}>
            {v.texto}
          </Link>
        ))}
      </div>

      {avisos.length === 0 ? (
        <p className="cartao mt-6 p-8 text-center text-sm text-tinta-70">Sem notificações.</p>
      ) : (
        <ul className="cartao mt-6 divide-y divide-marfim-200">
          {avisos.map((a) => {
            const porLer = a.channel === "SITE" && !a.readAt;
            const estado = ESTADO_AVISO[a.status];
            return (
              <li key={a.id} className="flex flex-wrap items-start gap-3 p-4">
                <span aria-hidden="true" className={`mt-2 h-2 w-2 shrink-0 rounded-full ${porLer ? "bg-ouro" : "bg-transparent"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-tinta-50">
                    {formatDateTime(a.createdAt)} · {PUBLICO_AVISO[a.audience] ?? a.audience}
                    {a.channel === "EMAIL" ? ` · e-mail para ${a.recipient ?? "—"}` : ""}
                  </p>
                  <p className={porLer ? "font-medium" : ""}>
                    {a.link ? (
                      <Link href={a.link} className="hover:text-ouro-escuro">
                        {a.title}
                      </Link>
                    ) : (
                      a.title
                    )}
                  </p>
                  {a.channel === "EMAIL" && estado && <span className={`selo mt-1 ${estado.cor}`}>{estado.texto}</span>}
                  {a.error && a.status === "FALHADA" && <p className="mt-1 text-xs text-rubi">{a.error}</p>}
                </div>
                {porLer && (
                  <BotaoAccao acao={marcarNotificacaoLida.bind(null, a.id)} className="text-xs text-ouro-escuro hover:underline">
                    Marcar como lida
                  </BotaoAccao>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
