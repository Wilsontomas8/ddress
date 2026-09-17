/**
 * =====================================================================
 *  PERMISSÕES POR PERFIL (RBAC)
 * =====================================================================
 *
 *  Para cada perfil e cada recurso do painel há um nível: nenhum, ver ou
 *  editar (editar inclui ver). O administrador altera a matriz em
 *  Painel → Permissões; o que não alterou segue o PADRÃO abaixo.
 *
 *  A mesma matriz decide, sempre no servidor:
 *    · que secções aparecem na navegação;
 *    · quem entra em cada página;
 *    · quem pode executar cada acção.
 *
 *  Regras fixas, que a matriz não muda:
 *    · o Administrador edita tudo;
 *    · Equipa e Permissões são só do Administrador — ninguém pode dar a
 *      si próprio ou a outro perfil o poder de mudar acessos;
 *    · o Cliente não entra no painel.
 *
 *  Este ficheiro é puro (sem base de dados) e pode ir para o navegador.
 *  A leitura dos ajustes guardados está em permissoes-servidor.ts.
 * =====================================================================
 */

import type { Role } from "@/db/schema";

export type Recurso =
  | "resumo"
  | "pedidos"
  | "provas"
  | "alugueres"
  | "entregas"
  | "produtos"
  | "colecoes"
  | "conteudos"
  | "parceiros"
  | "solicitacoes"
  | "clientes"
  | "notificacoes"
  | "relatorios"
  | "auditoria"
  | "equipa"
  | "permissoes"
  | "definicoes";

/** Nome antigo, mantido para não mexer em todo o painel */
export type Seccao = Recurso;

export type Nivel = "nenhum" | "ver" | "editar";

export type MatrizDoPerfil = Record<Recurso, Nivel>;

export const RECURSOS: { chave: Recurso; texto: string; descricao: string; href: string; grupo: string }[] = [
  { chave: "resumo", texto: "Resumo", descricao: "Indicadores e o que precisa de atenção hoje", href: "/admin", grupo: "Operação" },
  { chave: "pedidos", texto: "Pedidos", descricao: "Receber, confirmar, pagamentos, caução", href: "/admin/pedidos", grupo: "Operação" },
  { chave: "provas", texto: "Provas", descricao: "Agenda do ateliê, medidas, faltas", href: "/admin/marcacoes", grupo: "Operação" },
  { chave: "alugueres", texto: "Alugueres", descricao: "Reservas, devoluções, higienização, bloqueios", href: "/admin/alugueres", grupo: "Operação" },
  { chave: "entregas", texto: "Entregas", descricao: "Entregas e recolhas", href: "/admin/entregas", grupo: "Operação" },
  { chave: "solicitacoes", texto: "Solicitações", descricao: "Pedidos de maquilhagem e de sapatos", href: "/admin/solicitacoes", grupo: "Operação" },
  { chave: "notificacoes", texto: "Notificações", descricao: "Avisos de pedidos e solicitações", href: "/admin/notificacoes", grupo: "Operação" },
  { chave: "produtos", texto: "Peças", descricao: "Catálogo, preços, stock, sapatos sugeridos", href: "/admin/produtos", grupo: "Catálogo e conteúdo" },
  { chave: "colecoes", texto: "Colecções", descricao: "Colecções, vídeos e peças de cada uma", href: "/admin/colecoes", grupo: "Catálogo e conteúdo" },
  { chave: "conteudos", texto: "Conteúdos", descricao: "Quem somos: texto, destaques e vídeos", href: "/admin/conteudos", grupo: "Catálogo e conteúdo" },
  { chave: "parceiros", texto: "Parceiros", descricao: "Maquilhadoras e outros parceiros", href: "/admin/parceiros", grupo: "Catálogo e conteúdo" },
  { chave: "clientes", texto: "Clientes", descricao: "Clientes com e sem conta", href: "/admin/clientes", grupo: "Catálogo e conteúdo" },
  { chave: "relatorios", texto: "Relatórios", descricao: "Relatório mensal e exportação", href: "/admin/relatorios", grupo: "Gestão" },
  { chave: "auditoria", texto: "Auditoria", descricao: "Registo de acções", href: "/admin/auditoria", grupo: "Gestão" },
  { chave: "equipa", texto: "Equipa", descricao: "Contas de acesso ao painel", href: "/admin/equipa", grupo: "Gestão" },
  { chave: "permissoes", texto: "Permissões", descricao: "Quem vê e quem altera cada área", href: "/admin/permissoes", grupo: "Gestão" },
  { chave: "definicoes", texto: "Definições", descricao: "Loja, pagamentos e agenda do ateliê", href: "/admin/definicoes", grupo: "Gestão" },
];

/** Perfis que entram no painel de gestão */
export const PERFIS_DE_EQUIPA: Role[] = ["FUNCIONARIO", "ADMIN", "SUPORTE", "CONTABILISTA", "MOTORISTA"];

/** Perfis cuja matriz o administrador pode ajustar */
export const PERFIS_AJUSTAVEIS: Role[] = ["FUNCIONARIO", "SUPORTE", "CONTABILISTA", "MOTORISTA"];

/** Recursos que só o Administrador pode ter */
export const SO_ADMINISTRADOR: Recurso[] = ["equipa", "permissoes"];

/**
 * Ponto de partida, conforme o âmbito (SOW §4):
 *  · Funcionário: operação, catálogo e conteúdos;
 *  · Suporte técnico: diagnóstico, auditoria e definições, sem contas;
 *  · Contabilista: só leitura financeira;
 *  · Motorista: só entregas e recolhas.
 */
export const PERMISSOES_PADRAO: Record<Role, Partial<Record<Recurso, Nivel>>> = {
  CLIENTE: {},
  ADMIN: {},
  FUNCIONARIO: {
    resumo: "ver",
    pedidos: "editar",
    provas: "editar",
    alugueres: "editar",
    entregas: "editar",
    solicitacoes: "editar",
    notificacoes: "editar",
    produtos: "editar",
    colecoes: "editar",
    conteudos: "editar",
    parceiros: "ver",
    clientes: "ver",
  },
  SUPORTE: {
    resumo: "ver",
    pedidos: "ver",
    notificacoes: "ver",
    auditoria: "ver",
    definicoes: "editar",
  },
  CONTABILISTA: {
    resumo: "ver",
    relatorios: "ver",
  },
  MOTORISTA: {
    entregas: "editar",
  },
};

export type AjusteGuardado = { resource: string; canView: boolean; canEdit: boolean };

const TODOS = RECURSOS.map((r) => r.chave);

function nivelDe(canView: boolean, canEdit: boolean): Nivel {
  return canEdit ? "editar" : canView ? "ver" : "nenhum";
}

/** Matriz final de um perfil: padrão + ajustes do administrador + regras fixas */
export function construirMatriz(role: Role, ajustes: AjusteGuardado[] = []): MatrizDoPerfil {
  const matriz = Object.fromEntries(TODOS.map((r) => [r, "nenhum"])) as MatrizDoPerfil;

  if (role === "ADMIN") {
    for (const r of TODOS) matriz[r] = "editar";
    return matriz;
  }
  if (role === "CLIENTE") return matriz;

  for (const [r, n] of Object.entries(PERMISSOES_PADRAO[role] ?? {})) matriz[r as Recurso] = n as Nivel;
  for (const a of ajustes) {
    if (TODOS.includes(a.resource as Recurso)) matriz[a.resource as Recurso] = nivelDe(a.canView, a.canEdit);
  }
  for (const r of SO_ADMINISTRADOR) matriz[r] = "nenhum";
  return matriz;
}

export function podeVerNa(matriz: MatrizDoPerfil, recurso: Recurso): boolean {
  return matriz[recurso] === "ver" || matriz[recurso] === "editar";
}

export function podeEditarNa(matriz: MatrizDoPerfil, recurso: Recurso): boolean {
  return matriz[recurso] === "editar";
}

export function recursosVisiveis(matriz: MatrizDoPerfil): Recurso[] {
  return RECURSOS.map((r) => r.chave).filter((r) => podeVerNa(matriz, r));
}

/** Primeira secção a que o perfil tem acesso — serve de página de entrada */
export function paginaInicialDaMatriz(matriz: MatrizDoPerfil): string {
  const primeira = RECURSOS.find((r) => podeVerNa(matriz, r.chave));
  return primeira ? primeira.href : "/";
}

export function ehPerfilDeEquipa(role: Role | null | undefined): boolean {
  return !!role && PERFIS_DE_EQUIPA.includes(role);
}
