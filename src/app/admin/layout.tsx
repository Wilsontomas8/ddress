import { redirect } from "next/navigation";
import { and, count, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { appointments, orderItems, orders, serviceRequests } from "@/db/schema";
import { getUtilizador } from "@/lib/auth";
import { ehPerfilDeEquipa, recursosVisiveis } from "@/lib/permissoes";
import { matrizDoPerfil } from "@/lib/permissoes-servidor";
import PainelShell from "@/components/admin/PainelShell";
import { PAPEL } from "@/lib/labels";
import { today } from "@/lib/dates";
import { avaliarReservasPendentes, expirarSeNecessario } from "@/lib/reservas";
import { avisosDaLojaPorLer } from "@/lib/notificacoes";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Painel", template: "%s · Painel DDRESS" } };

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const utilizador = await getUtilizador();
  if (!utilizador) redirect("/entrar?destino=/admin");
  if (!ehPerfilDeEquipa(utilizador.role)) redirect("/");

  await expirarSeNecessario();
  const minhas = recursosVisiveis(await matrizDoPerfil(utilizador.role));

  const [[porTratar], [provasHoje], [entregas], [recolhas], emRisco, [solicitacoesNovas], avisosPorLer] = await Promise.all([
    minhas.includes("pedidos")
      ? db.select({ n: count() }).from(orders).where(inArray(orders.status, ["NOVO", "RECEBIDO", "AGUARDA_PROVA"]))
      : Promise.resolve([{ n: 0 }]),

    minhas.includes("provas")
      ? db
          .select({ n: count() })
          .from(appointments)
          .where(and(eq(appointments.date, today()), inArray(appointments.status, ["PENDENTE", "CONFIRMADA"])))
      : Promise.resolve([{ n: 0 }]),

    minhas.includes("entregas")
      ? db.select({ n: count() }).from(orders).where(and(eq(orders.status, "PRONTO"), isNotNull(orders.customerAddress)))
      : Promise.resolve([{ n: 0 }]),

    minhas.includes("entregas")
      ? db
          .select({ n: count() })
          .from(orders)
          .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
          .where(and(eq(orders.status, "EM_ALUGUER"), lte(orderItems.endDate, today())))
      : Promise.resolve([{ n: 0 }]),

    minhas.includes("pedidos") ? avaliarReservasPendentes() : Promise.resolve([]),

    minhas.includes("solicitacoes")
      ? db.select({ n: count() }).from(serviceRequests).where(eq(serviceRequests.status, "NOVO"))
      : Promise.resolve([{ n: 0 }]),

    minhas.includes("notificacoes") ? avisosDaLojaPorLer() : Promise.resolve(0),
  ]);

  const tarefas = (entregas?.n ?? 0) + (recolhas?.n ?? 0);
  const contadores = {
    pedidos: porTratar?.n ?? 0,
    provas: provasHoje?.n ?? 0,
    entregas: tarefas,
    solicitacoes: solicitacoesNovas?.n ?? 0,
    notificacoes: avisosPorLer,
  };

  return (
    <PainelShell
      visiveis={minhas}
      papelTexto={PAPEL[utilizador.role]}
      nome={utilizador.name}
      email={utilizador.email}
      contadores={contadores}
      alertas={contadores.pedidos + contadores.provas + contadores.entregas + contadores.solicitacoes + emRisco.length + avisosPorLer}
      avisosHref={minhas.includes("notificacoes") ? "/admin/notificacoes" : "/admin"}
    >
      {children}
    </PainelShell>
  );
}
