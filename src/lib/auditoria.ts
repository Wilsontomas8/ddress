import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export type AreaAuditada =
  | "PERMISSOES"
  | "COLECCAO"
  | "CONTEUDO"
  | "PARCEIRO"
  | "SOLICITACAO"
  | "PRODUTO"
  | "EQUIPA"
  | "DEFINICOES"
  | "NOTIFICACAO";

/** Regista uma alteração que não pertence a um pedido (ver order_events). */
export async function registarAlteracao(opts: {
  actorId: string | null;
  area: AreaAuditada;
  acao: string;
  entidadeId?: string | null;
  mensagem: string;
}) {
  await db.insert(auditLogs).values({
    actorId: opts.actorId,
    area: opts.area,
    action: opts.acao,
    entityId: opts.entidadeId ?? null,
    message: opts.mensagem,
  });
}
