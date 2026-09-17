"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  CalendarClock,
  ChartColumn,
  LayoutDashboard,
  LogOut,
  Menu,
  Repeat,
  Search,
  Settings,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Store,
  Truck,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { PERMISSOES, type Seccao } from "@/lib/permissoes";
import type { Role } from "@/db/schema";

type Props = {
  papel: Role;
  papelTexto: string;
  nome: string;
  email: string;
  contadores: Partial<Record<Seccao, number>>;
  alertas: number;
  children: React.ReactNode;
};

const SECCOES: Record<Seccao, { href: string; texto: string; icone: LucideIcon; exato?: boolean }> = {
  resumo: { href: "/admin", texto: "Resumo", icone: LayoutDashboard, exato: true },
  pedidos: { href: "/admin/pedidos", texto: "Pedidos", icone: ShoppingBag },
  provas: { href: "/admin/marcacoes", texto: "Provas", icone: CalendarClock },
  alugueres: { href: "/admin/alugueres", texto: "Alugueres", icone: Repeat },
  entregas: { href: "/admin/entregas", texto: "Entregas", icone: Truck },
  produtos: { href: "/admin/produtos", texto: "Peças", icone: Shirt },
  clientes: { href: "/admin/clientes", texto: "Clientes", icone: Users },
  relatorios: { href: "/admin/relatorios", texto: "Relatórios", icone: ChartColumn },
  auditoria: { href: "/admin/auditoria", texto: "Auditoria", icone: ShieldCheck },
  equipa: { href: "/admin/equipa", texto: "Equipa", icone: UserCog },
  definicoes: { href: "/admin/definicoes", texto: "Definições", icone: Settings },
};

/** Grupos da barra lateral: operação diária em cima, gestão em baixo */
const GRUPOS: { titulo: string; seccoes: Seccao[] }[] = [
  { titulo: "Operação", seccoes: ["resumo", "pedidos", "provas", "alugueres", "entregas"] },
  { titulo: "Catálogo e clientes", seccoes: ["produtos", "clientes"] },
  { titulo: "Gestão", seccoes: ["relatorios", "auditoria", "equipa", "definicoes"] },
];

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function PainelShell({ papel, papelTexto, nome, email, contadores, alertas, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const [procura, setProcura] = useState("");
  const [aSair, setASair] = useState(false);

  useEffect(() => setMenuAberto(false), [pathname]);

  const minhas = PERMISSOES[papel] ?? [];
  const podePesquisarPedidos = minhas.includes("pedidos");

  async function sair() {
    setASair(true);
    await fetch("/api/auth/sair", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const barraLateral = (
    <div className="flex h-full flex-col">
      <div className="flex h-18 items-center justify-between px-5">
        <Link href="/admin" className="flex items-center gap-2.5" aria-label="DDRESS — painel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/ddress-simbolo.png" alt="" aria-hidden="true" className="h-9 w-auto" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/ddress-nome.png" alt="" aria-hidden="true" className="h-4 w-auto" />
        </Link>
        <button type="button" className="rounded-lg p-2 text-tinta-70 lg:hidden" onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      <nav aria-label="Secções do painel" className="flex-1 overflow-y-auto px-3 pb-6">
        {GRUPOS.map((g) => {
          const visiveis = g.seccoes.filter((s) => minhas.includes(s));
          if (visiveis.length === 0) return null;
          return (
            <div key={g.titulo} className="mt-5 first:mt-2">
              <p className="px-3 pb-2 text-[0.625rem] font-semibold tracking-[0.14em] text-tinta-50 uppercase">{g.titulo}</p>
              <ul className="space-y-0.5">
                {visiveis.map((chave) => {
                  const s = SECCOES[chave];
                  const Icone = s.icone;
                  const ativo = s.exato ? pathname === s.href : pathname.startsWith(s.href);
                  const n = contadores[chave];
                  return (
                    <li key={chave}>
                      <Link
                        href={s.href}
                        aria-current={ativo ? "page" : undefined}
                        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          ativo
                            ? "bg-marfim-100 text-tinta shadow-[inset_0_0_0_1px_var(--color-marfim-200)]"
                            : "text-tinta-70 hover:bg-marfim-100/60 hover:text-tinta"
                        }`}
                      >
                        <Icone className={`h-[1.125rem] w-[1.125rem] ${ativo ? "text-ouro-claro" : ""}`} strokeWidth={1.6} />
                        <span className="flex-1">{s.texto}</span>
                        {typeof n === "number" && n > 0 && (
                          <span className="num rounded-full bg-ouro px-1.5 py-px text-[0.625rem] font-semibold text-preto">{n}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-marfim-200 p-3 [@media(min-height:62rem)]:border-t-0">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-tinta-70 transition-colors hover:bg-marfim-100/60 hover:text-tinta [@media(min-height:62rem)]:hidden"
        >
          <Store className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.6} />
          Ver a loja
        </Link>
        <div className="cartao hidden overflow-hidden p-4 [@media(min-height:62rem)]:block">
          <div className="pointer-events-none -mx-4 -mt-4 mb-3 h-14 bg-[radial-gradient(120%_120%_at_0%_0%,rgb(230_197_106/0.35),transparent_60%)]" />
          <p className="-mt-12 flex h-9 w-9 items-center justify-center rounded-lg bg-ouro/15 text-ouro-claro">
            <Store className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.6} />
          </p>
          <p className="mt-3 text-sm font-semibold text-tinta">Ver a loja</p>
          <p className="mt-1 text-xs leading-relaxed text-tinta-50">Veja o site como os clientes o vêem.</p>
          <Link href="/" className="btn btn-principal btn-sm mt-4 w-full">
            Abrir a loja
          </Link>
        </div>
        <button
          type="button"
          onClick={sair}
          disabled={aSair}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 [@media(min-height:62rem)]:mt-3 text-sm text-tinta-70 transition-colors hover:bg-marfim-100/60 hover:text-tinta"
        >
          <LogOut className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.6} />
          {aSair ? "A sair…" : "Terminar sessão"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="tema-escuro min-h-screen bg-[radial-gradient(80%_50%_at_60%_-10%,rgb(201_163_58/0.10),transparent_60%)]">
      {/* barra lateral fixa em ecrãs largos */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-marfim-200 bg-marfim-50/95 lg:block">{barraLateral}</aside>

      {/* barra lateral em gaveta nos restantes */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu do painel">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} />
          <aside className="relative h-full w-72 max-w-[85vw] border-r border-marfim-200 bg-marfim-50">{barraLateral}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* barra de topo */}
        <header className="sticky top-0 z-30 border-b border-marfim-200 bg-marfim-50/80 backdrop-blur-md">
          <div className="flex h-18 items-center gap-3 px-4 sm:px-8">
            <button type="button" className="-ml-2 rounded-lg p-2 text-tinta-70 lg:hidden" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>

            {podePesquisarPedidos ? (
              <form
                role="search"
                className="relative hidden w-full max-w-sm sm:block"
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = procura.trim();
                  router.push(q ? `/admin/pedidos?separador=todos&q=${encodeURIComponent(q)}` : "/admin/pedidos");
                }}
              >
                <label htmlFor="procura-painel" className="sr-only">
                  Procurar pedidos
                </label>
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-tinta-50" strokeWidth={1.6} />
                <input
                  id="procura-painel"
                  type="search"
                  value={procura}
                  onChange={(e) => setProcura(e.target.value)}
                  placeholder="Procurar pedido, cliente ou telefone…"
                  className="campo min-h-10 rounded-xl py-2 pl-9 text-sm"
                />
              </form>
            ) : (
              <span />
            )}

            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/admin"
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-marfim-200 text-tinta-70 transition-colors hover:text-tinta"
                aria-label={alertas > 0 ? `${alertas} assunto(s) a precisar de atenção` : "Sem alertas"}
              >
                <Bell className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.6} />
                {alertas > 0 && <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-ouro-claro ring-2 ring-marfim-50" />}
              </Link>

              <div className="ml-2 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-ouro-claro),var(--color-ouro))] text-sm font-semibold text-preto"
                >
                  {iniciais(nome)}
                </span>
                <span className="hidden leading-tight sm:block">
                  <span className="block text-sm font-medium text-tinta">{nome}</span>
                  <span className="block text-xs text-tinta-50">
                    {papelTexto} · {email}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </header>

        <main id="conteudo" className="px-4 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
