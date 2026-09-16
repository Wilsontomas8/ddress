"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = { ehAdmin: boolean; porTratar: number; provasHoje: number };

export default function NavAdmin({ ehAdmin, porTratar, provasHoje }: Props) {
  const pathname = usePathname();

  const ligacoes = [
    { href: "/admin", texto: "Resumo", exato: true },
    { href: "/admin/pedidos", texto: "Pedidos", contador: porTratar },
    { href: "/admin/marcacoes", texto: "Provas", contador: provasHoje },
    { href: "/admin/alugueres", texto: "Alugueres" },
    { href: "/admin/produtos", texto: "Peças" },
    { href: "/admin/clientes", texto: "Clientes" },
    ...(ehAdmin
      ? [
          { href: "/admin/equipa", texto: "Equipa" },
          { href: "/admin/definicoes", texto: "Definições" },
        ]
      : []),
  ];

  return (
    <nav className="border-t border-areia-100">
      <ul className="mx-auto flex max-w-[110rem] gap-1 overflow-x-auto px-2">
        {ligacoes.map((l) => {
          const ativo = l.exato ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors ${
                  ativo
                    ? "border-vinho text-vinho"
                    : "border-transparent text-tinta-70 hover:text-tinta"
                }`}
              >
                {l.texto}
                {typeof l.contador === "number" && l.contador > 0 && (
                  <span className="rounded-full bg-vinho px-1.5 text-[0.65rem] font-semibold text-white">
                    {l.contador}
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
