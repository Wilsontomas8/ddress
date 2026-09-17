"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCarrinho } from "./Carrinho";
import { PERFIS_DE_EQUIPA } from "@/lib/permissoes";
import type { Role } from "@/db/schema";

type Props = {
  nomeLoja: string;
  utilizador: { nome: string; role: string } | null;
};

const LIGACOES = [
  { href: "/loja/mulher", texto: "Mulher" },
  { href: "/loja/homem", texto: "Homem" },
  { href: "/loja/crianca", texto: "Criança" },
  { href: "/loja?tipo=aluguer", texto: "Aluguer" },
  { href: "/marcacao", texto: "Marcar prova" },
  { href: "/acompanhar", texto: "Acompanhar pedido" },
];

export default function Cabecalho({ nomeLoja, utilizador }: Props) {
  const { totalPecas, carregado } = useCarrinho();
  const [menuAberto, setMenuAberto] = useState(false);
  const [procura, setProcura] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  function submeterProcura(e: React.FormEvent) {
    e.preventDefault();
    const q = procura.trim();
    router.push(q ? `/loja?q=${encodeURIComponent(q)}` : "/loja");
  }

  const equipa = !!utilizador && PERFIS_DE_EQUIPA.includes(utilizador.role as Role);

  return (
    <header className="sticky top-0 z-40 bg-preto text-marfim-50">
      {/* faixa superior */}
      <div className="border-b border-ouro/20 bg-carvao">
        <p className="mx-auto max-w-7xl px-4 py-1.5 text-center text-[0.68rem] tracking-[0.16em] text-ouro-claro uppercase">
          Prova no ateliê com marcação · Entregas em Luanda
        </p>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <button
          type="button"
          className="-ml-1 p-2 lg:hidden"
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((v) => !v)}
        >
          <span className="block h-px w-6 bg-ouro-claro" />
          <span className="mt-1.5 block h-px w-6 bg-ouro-claro" />
          <span className="mt-1.5 block h-px w-6 bg-ouro-claro" />
        </button>

        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={nomeLoja}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marca/ddress-simbolo.png"
            alt=""
            aria-hidden="true"
            className="h-11 w-auto sm:h-12"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marca/ddress-nome.png"
            alt={nomeLoja}
            className="hidden h-6 w-auto sm:block"
          />
        </Link>

        <nav className="ml-6 hidden items-center gap-6 lg:flex">
          {LIGACOES.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-marfim-200 transition-colors hover:text-ouro-claro"
            >
              {l.texto}
            </Link>
          ))}
        </nav>

        <form onSubmit={submeterProcura} className="ml-auto hidden xl:block">
          <label className="sr-only" htmlFor="procura">
            Procurar peças
          </label>
          <input
            id="procura"
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
            placeholder="Procurar peça…"
            className="w-44 border-b border-ouro/40 bg-transparent px-1 py-1 text-sm text-marfim-50 placeholder:text-marfim-400 focus:border-ouro focus:outline-none"
          />
        </form>

        <div className="ml-auto flex items-center gap-4 xl:ml-4">
          {equipa && (
            <Link
              href="/admin"
              className="hidden text-sm text-ouro-claro underline-offset-4 hover:underline sm:inline"
            >
              Painel
            </Link>
          )}
          <Link
            href={utilizador ? "/conta" : "/entrar"}
            className="text-sm text-marfim-200 transition-colors hover:text-ouro-claro"
          >
            {utilizador ? utilizador.nome.split(" ")[0] : "Entrar"}
          </Link>
          <Link
            href="/carrinho"
            className="relative text-sm text-marfim-200 transition-colors hover:text-ouro-claro"
          >
            Carrinho
            {carregado && totalPecas > 0 && (
              <span className="absolute -top-2 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-ouro px-1 text-[0.65rem] font-semibold text-preto">
                {totalPecas}
              </span>
            )}
          </Link>
        </div>
      </div>

      {menuAberto && (
        <nav className="border-t border-ouro/20 bg-preto lg:hidden">
          <ul className="mx-auto max-w-7xl px-4 py-2">
            {LIGACOES.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block border-b border-carvao-claro py-3 text-sm text-marfim-100"
                >
                  {l.texto}
                </Link>
              </li>
            ))}
            {equipa && (
              <li>
                <Link href="/admin" className="block py-3 text-sm text-ouro-claro">
                  Painel de gestão
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}

      <div className="filete-ouro" />
    </header>
  );
}
