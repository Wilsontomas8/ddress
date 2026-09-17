"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PERMISSOES, type Seccao } from "@/lib/permissoes";
import type { Role } from "@/db/schema";

type Props = {
  papel: Role;
  porTratar: number;
  provasHoje: number;
  tarefasHoje: number;
};

const SECCOES: Record<Seccao, { href: string; texto: string; exato?: boolean }> = {
  resumo: { href: "/admin", texto: "Resumo", exato: true },
  pedidos: { href: "/admin/pedidos", texto: "Pedidos" },
  provas: { href: "/admin/marcacoes", texto: "Provas" },
  alugueres: { href: "/admin/alugueres", texto: "Alugueres" },
  entregas: { href: "/admin/entregas", texto: "Entregas" },
  produtos: { href: "/admin/produtos", texto: "Peças" },
  clientes: { href: "/admin/clientes", texto: "Clientes" },
  relatorios: { href: "/admin/relatorios", texto: "Relatórios" },
  auditoria: { href: "/admin/auditoria", texto: "Auditoria" },
  equipa: { href: "/admin/equipa", texto: "Equipa" },
  definicoes: { href: "/admin/definicoes", texto: "Definições" },
};

export default function NavAdmin({ papel, porTratar, provasHoje, tarefasHoje }: Props) {
  const pathname = usePathname();

  const contadores: Partial<Record<Seccao, number>> = {
    pedidos: porTratar,
    provas: provasHoje,
    entregas: tarefasHoje,
  };

  const minhasSeccoes = PERMISSOES[papel] ?? [];

  return (
    <nav className="border-t border-carvao-claro bg-preto">
      <ul className="mx-auto flex max-w-[110rem] gap-1 overflow-x-auto px-2">
        {minhasSeccoes.map((chave) => {
          const l = SECCOES[chave];
          const ativo = l.exato ? pathname === l.href : pathname.startsWith(l.href);
          const contador = contadores[chave];

          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors ${
                  ativo
                    ? "border-ouro text-ouro-claro"
                    : "border-transparent text-marfim-300 hover:text-marfim-50"
                }`}
              >
                {l.texto}
                {typeof contador === "number" && contador > 0 && (
                  <span className="rounded-full bg-ouro px-1.5 text-[0.65rem] font-semibold text-preto">
                    {contador}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
