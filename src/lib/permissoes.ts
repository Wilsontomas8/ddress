/**
 * =====================================================================
 *  MATRIZ DE PERMISSÕES (RBAC)
 * =====================================================================
 *
 *  Uma única tabela decide o que cada perfil vê e pode fazer. É usada
 *  em três sítios, sempre com a mesma fonte de verdade:
 *
 *    · na navegação do painel, para mostrar apenas as secções próprias;
 *    · na entrada de cada página do painel, que recusa quem não tem
 *      acesso;
 *    · nas acções do servidor, antes de gravar seja o que for.
 * =====================================================================
 */

import type { Role } from "@/db/schema";

/** Secções do painel de gestão */
export type Seccao =
  | "resumo"
  | "pedidos"
  | "provas"
  | "alugueres"
  | "entregas"
  | "produtos"
  | "clientes"
  | "relatorios"
  | "auditoria"
  | "equipa"
  | "definicoes";

export const PERMISSOES: Record<Role, Seccao[]> = {
  CLIENTE: [],

  FUNCIONARIO: [
    "resumo",
    "pedidos",
    "provas",
    "alugueres",
    "entregas",
    "produtos",
    "clientes",
  ],

  ADMIN: [
    "resumo",
    "pedidos",
    "provas",
    "alugueres",
    "entregas",
    "produtos",
    "clientes",
    "relatorios",
    "auditoria",
    "equipa",
    "definicoes",
  ],

  // Suporte técnico: diagnostica e audita, mas não mexe em contas nem
  // em permissões (restrição expressa no âmbito).
  SUPORTE: ["resumo", "pedidos", "auditoria", "definicoes"],

  // Contabilista: leitura financeira e exportação, nada mais.
  CONTABILISTA: ["resumo", "relatorios"],

  // Motorista: só as suas tarefas de entrega e recolha.
  MOTORISTA: ["entregas"],
};

/** Perfis que entram no painel de gestão */
export const PERFIS_DE_EQUIPA: Role[] = [
  "FUNCIONARIO",
  "ADMIN",
  "SUPORTE",
  "CONTABILISTA",
  "MOTORISTA",
];

export function ehPerfilDeEquipa(role: Role | null | undefined): boolean {
  return !!role && PERFIS_DE_EQUIPA.includes(role);
}

export function podeVer(role: Role | null | undefined, seccao: Seccao): boolean {
  if (!role) return false;
  return PERMISSOES[role]?.includes(seccao) ?? false;
}

/** Primeira secção a que o perfil tem acesso — serve de página de entrada */
export function paginaInicialDoPerfil(role: Role): string {
  const rotas: Record<Seccao, string> = {
    resumo: "/admin",
    pedidos: "/admin/pedidos",
    provas: "/admin/marcacoes",
    alugueres: "/admin/alugueres",
    entregas: "/admin/entregas",
    produtos: "/admin/produtos",
    clientes: "/admin/clientes",
    relatorios: "/admin/relatorios",
    auditoria: "/admin/auditoria",
    equipa: "/admin/equipa",
    definicoes: "/admin/definicoes",
  };
  const primeira = PERMISSOES[role]?.[0];
  return primeira ? rotas[primeira] : "/";
}

/**
 * Acções sensíveis, para além do acesso às secções.
 * O suporte técnico vê tudo o que precisa para diagnosticar, mas não
 * cria utilizadores nem altera funções.
 */
export const ACCOES = {
  gerirContas: (role: Role | null | undefined) => role === "ADMIN",
  alterarDefinicoes: (role: Role | null | undefined) =>
    role === "ADMIN" || role === "SUPORTE",
  tratarPedidos: (role: Role | null | undefined) =>
    role === "ADMIN" || role === "FUNCIONARIO",
  registarEntregas: (role: Role | null | undefined) =>
    role === "ADMIN" || role === "FUNCIONARIO" || role === "MOTORISTA",
  exportarFinanceiro: (role: Role | null | undefined) =>
    role === "ADMIN" || role === "CONTABILISTA",
};
