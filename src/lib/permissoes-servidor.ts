import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rolePermissions, type Role } from "@/db/schema";
import { construirMatriz, type MatrizDoPerfil } from "./permissoes";

/**
 * Matriz de permissões de um perfil, com os ajustes guardados pelo
 * administrador. Lida uma vez por pedido HTTP.
 */
export const matrizDoPerfil = cache(async (role: Role): Promise<MatrizDoPerfil> => {
  if (role === "ADMIN" || role === "CLIENTE") return construirMatriz(role);
  const ajustes = await db
    .select({ resource: rolePermissions.resource, canView: rolePermissions.canView, canEdit: rolePermissions.canEdit })
    .from(rolePermissions)
    .where(eq(rolePermissions.role, role));
  return construirMatriz(role, ajustes);
});
