"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCarrinho } from "./Carrinho";
import { PERFIS_DE_EQUIPA } from "@/lib/permissoes";
import type { Role } from "@/db/schema";

type Props = {
  nomeLoja: string;
  utilizador: { nome: string; role: string } | null;
};

const LIGACOES_ESQUERDA = [
  { href: "/loja/mulher", texto: "Mulher" },
  { href: "/loja/homem", texto: "Homem" },
  { href: "/loja/crianca", texto: "Criança" },
  { href: "/loja?tipo=aluguer", texto: "Aluguer" },
];

const LIGACOES_DIREITA = [
  { href: "/marcacao", texto: "Marcar prova" },
  { href: "/acompanhar", texto: "Acompanhar pedido" },
];

export default function Cabecalho({ nomeLoja, utilizador }: Props) {
  const { totalPecas, carregado } = useCarrinho();
  const pathname = usePathname();
  const router = useRouter();
  const inicio = pathname === "/";

  const [menuAberto, setMenuAberto] = useState(false);
  const [procuraAberta, setProcuraAberta] = useState(false);
  const [procura, setProcura] = useState("");
  const [rolou, setRolou] = useState(false);
  const campoProcura = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMenuAberto(false);
    setProcuraAberta(false);
  }, [pathname]);

  // Na página inicial o cabeçalho flutua transparente sobre o vídeo e
  // ganha fundo quando a pessoa começa a descer.
  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  useEffect(() => {
    if (procuraAberta) campoProcura.current?.focus();
  }, [procuraAberta]);

  useEffect(() => {
    document.body.style.overflow = menuAberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuAberto]);

  function submeterProcura(e: React.FormEvent) {
    e.preventDefault();
    const q = procura.trim();
    router.push(q ? `/loja?q=${encodeURIComponent(q)}` : "/loja");
  }

  const equipa = !!utilizador && PERFIS_DE_EQUIPA.includes(utilizador.role as Role);
  const transparente = inicio && !rolou && !procuraAberta && !menuAberto;

  const classeLigacao =
    "rotulo text-marfim-100/85 transition-colors hover:text-ouro-claro aria-[current=page]:text-ouro-claro";

  return (
    <header
      className={`${inicio ? "fixed" : "sticky"} inset-x-0 top-0 z-50 text-marfim-50 transition-colors duration-300 ${
        transparente ? "bg-transparent" : "bg-preto/95 backdrop-blur-md"
      }`}
    >
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ${
          rolou ? "max-h-0 opacity-0" : "max-h-10 opacity-100"
        }`}
      >
        <p className="rotulo mx-auto max-w-[90rem] px-4 py-2 text-center text-[0.625rem] text-ouro-claro/90 sm:px-8">
          <span className="sm:hidden">Prova no ateliê · Entregas em Luanda</span>
          <span className="hidden sm:inline">Prova no ateliê com marcação · Aluguer por dia ou fim-de-semana · Entregas em Luanda</span>
        </p>
      </div>

      <div className="mx-auto grid h-16 max-w-[90rem] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:h-20 sm:px-8">
        {/* esquerda */}
        <div className="flex items-center gap-7">
          <button
            type="button"
            className="-ml-2 p-2 lg:hidden"
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto(true)}
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <nav aria-label="Colecções" className="hidden items-center gap-7 lg:flex">
            {LIGACOES_ESQUERDA.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={classeLigacao}
                aria-current={pathname === l.href.split("?")[0] && !l.href.includes("?") ? "page" : undefined}
              >
                {l.texto}
              </Link>
            ))}
          </nav>
        </div>

        {/* centro: marca */}
        <Link href="/" className="flex items-center gap-3" aria-label={`${nomeLoja} — início`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/ddress-simbolo.png" alt="" aria-hidden="true" className="h-10 w-auto sm:h-12" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/ddress-nome.png" alt="" aria-hidden="true" className="hidden h-5 w-auto md:block" />
        </Link>

        {/* direita */}
        <div className="flex items-center justify-end gap-1 sm:gap-3">
          <nav aria-label="Serviços" className="mr-4 hidden items-center gap-7 xl:flex">
            {LIGACOES_DIREITA.map((l) => (
              <Link key={l.href} href={l.href} className={classeLigacao} aria-current={pathname === l.href ? "page" : undefined}>
                {l.texto}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            className="p-2 text-marfim-100/85 transition-colors hover:text-ouro-claro"
            aria-label={procuraAberta ? "Fechar procura" : "Procurar peças"}
            aria-expanded={procuraAberta}
            onClick={() => setProcuraAberta((v) => !v)}
          >
            {procuraAberta ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Search className="h-5 w-5" strokeWidth={1.5} />}
          </button>

          {equipa && (
            <Link
              href="/admin"
              className="hidden p-2 text-marfim-100/85 transition-colors hover:text-ouro-claro sm:block"
              aria-label="Painel de gestão"
              title="Painel de gestão"
            >
              <LayoutDashboard className="h-5 w-5" strokeWidth={1.5} />
            </Link>
          )}

          <Link
            href={utilizador ? "/conta" : "/entrar"}
            className="hidden items-center gap-2 p-2 text-marfim-100/85 transition-colors hover:text-ouro-claro sm:flex"
            aria-label={utilizador ? `A minha conta (${utilizador.nome})` : "Entrar"}
          >
            <User className="h-5 w-5" strokeWidth={1.5} />
          </Link>

          <Link
            href="/carrinho"
            className="relative p-2 text-marfim-100/85 transition-colors hover:text-ouro-claro"
            aria-label={`Carrinho${carregado && totalPecas > 0 ? `, ${totalPecas} peça(s)` : ""}`}
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
            {carregado && totalPecas > 0 && (
              <span className="num absolute top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-ouro px-1 text-[0.625rem] font-semibold text-preto">
                {totalPecas}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* procura */}
      {procuraAberta && (
        <form onSubmit={submeterProcura} role="search" className="border-t border-white/10 bg-preto/95">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5 sm:px-8">
            <label className="sr-only" htmlFor="procura">
              Procurar peças
            </label>
            <Search className="h-5 w-5 shrink-0 text-ouro-claro" strokeWidth={1.5} aria-hidden="true" />
            <input
              ref={campoProcura}
              id="procura"
              name="q"
              type="search"
              autoComplete="off"
              value={procura}
              onChange={(e) => setProcura(e.target.value)}
              placeholder="Vestido de gala, smoking, dama de honor…"
              className="w-full bg-transparent py-2 font-display text-xl text-marfim-50 placeholder:text-marfim-400 focus:outline-none sm:text-2xl"
            />
            <button type="submit" className="btn btn-principal btn-sm">
              Procurar
            </button>
          </div>
        </form>
      )}

      {!transparente && <div className="filete-ouro opacity-60" />}

      {/* menu em ecrãs pequenos */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 flex flex-col bg-preto lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex h-16 items-center justify-between px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/ddress-nome.png" alt={nomeLoja} className="h-5 w-auto" />
            <button type="button" className="-mr-2 p-2" aria-label="Fechar menu" onClick={() => setMenuAberto(false)}>
              <X className="h-6 w-6" strokeWidth={1.5} />
            </button>
          </div>
          <div className="filete-ouro opacity-60" />
          <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-6 py-8">
            <ul className="space-y-1">
              {[...LIGACOES_ESQUERDA, ...LIGACOES_DIREITA, { href: "/como-funciona", texto: "Como funciona" }].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block py-2.5 font-display text-3xl text-marfim-50 italic">
                    {l.texto}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={utilizador ? "/conta" : "/entrar"} className="btn btn-contorno-claro">
                {utilizador ? `Conta de ${utilizador.nome.split(" ")[0]}` : "Entrar"}
              </Link>
              {equipa && (
                <Link href="/admin" className="btn btn-principal">
                  Painel de gestão
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
