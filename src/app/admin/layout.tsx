import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, eq, inArray, isNotNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { appointments, orderItems, orders } from "@/db/schema";
import { getUtilizador } from "@/lib/auth";
import { ehPerfilDeEquipa, PERMISSOES } from "@/lib/permissoes";
import { getSettings } from "@/lib/settings";
import BotaoSair from "@/components/BotaoSair";
import NavAdmin from "@/components/NavAdmin";
import { PAPEL } from "@/lib/labels";
import { today, toISODay } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Painel", template: "%s · Painel DDRESS" } };

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const utilizador = await getUtilizador();
  if (!utilizador) redirect("/entrar?destino=/admin");
  if (!ehPerfilDeEquipa(utilizador.role)) redirect("/");

  const loja = await getSettings();
  const minhas = PERMISSOES[utilizador.role] ?? [];

  const [[porTratar], [provasHoje], [entregas], [recolhas]] = await Promise.all([
    minhas.includes("pedidos")
      ? db
          .select({ n: count() })
          .from(orders)
          .where(inArray(orders.status, ["NOVO", "RECEBIDO", "AGUARDA_PROVA"]))
      : Promise.resolve([{ n: 0 }]),

    minhas.includes("provas")
      ? db
          .select({ n: count() })
          .from(appointments)
          .where(
            and(
              eq(appointments.date, today()),
              inArray(appointments.status, ["PENDENTE", "CONFIRMADA"])
            )
          )
      : Promise.resolve([{ n: 0 }]),

    minhas.includes("entregas")
      ? db
          .select({ n: count() })
          .from(orders)
          .where(and(eq(orders.status, "PRONTO"), isNotNull(orders.customerAddress)))
      : Promise.resolve([{ n: 0 }]),

    minhas.includes("entregas")
      ? db
          .select({ n: count() })
          .from(orders)
          .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
          .where(and(eq(orders.status, "EM_ALUGUER"), lte(orderItems.endDate, today())))
      : Promise.resolve([{ n: 0 }]),
  ]);

  return (
    <div className="min-h-screen bg-marfim-50">
      <header className="bg-preto text-marfim-100">
        <div className="mx-auto flex max-w-[110rem] flex-wrap items-center gap-4 px-4 py-2.5">
          <Link href="/admin" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/ddress-simbolo.png" alt="" aria-hidden="true" className="h-9 w-auto" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/ddress-nome.png" alt={loja.storeName} className="h-5 w-auto" />
            <span className="ml-1 text-sm text-marfim-400">painel</span>
          </Link>

          <div className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/" className="text-marfim-300 hover:text-ouro-claro">
              Ver a loja
            </Link>
            <span className="text-marfim-400">
              {utilizador.name} · {PAPEL[utilizador.role]}
            </span>
            <BotaoSair classe="text-sm text-ouro-claro underline underline-offset-4" />
          </div>
        </div>

        <NavAdmin
          papel={utilizador.role}
          porTratar={porTratar?.n ?? 0}
          provasHoje={provasHoje?.n ?? 0}
          tarefasHoje={(entregas?.n ?? 0) + (recolhas?.n ?? 0)}
        />
        <div className="filete-ouro" />
      </header>

      <main className="mx-auto max-w-[110rem] px-4 py-8">{children}</main>

      <footer className="mx-auto max-w-[110rem] px-4 pb-10 text-xs text-tinta-50">
        Hoje é {toISODay(today())}. Agenda do ateliê: {loja.openHour}–{loja.closeHour},{" "}
        {loja.slotCapacity} cabine(s), provas de {loja.slotMinutes} minutos.
      </footer>
    </div>
  );
}
