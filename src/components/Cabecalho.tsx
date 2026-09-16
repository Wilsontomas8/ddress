"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCarrinho } from "./Carrinho";

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

  const equipa = utilizador?.role === "ADMIN" || utilizador?.role === "FUNCIONARIO";

  return (
    <header className="sticky top-0 z-40 border-b border-areia-200 bg-areia-50/95 backdrop-blur">
      {/* faixa superior */}
      <div className="bg-tinta text-areia-100">
        <p className="mx-auto max-w-7xl px-4 py-1.5 text-center text-[0.7rem] tracking-[0.12em] uppercase">
          Prova no ateliê com marcação · Entregas em Luanda
        </p>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
        <button
          type="button"
          className="-ml-1 p-2 md:hidden"
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((v) => !v)}
        >
          <span className="block h-px w-6 bg-tinta" />
          <span className="mt-1.5 block h-px w-6 bg-tinta" />
          <span className="mt-1.5 block h-px w-6 bg-tinta" />
        </button>

        <Link href="/" className="shrink-0">
          <span className="font-display text-xl tracking-tight text-tinta sm:text-2xl">
            {nomeLoja}
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-6 md:flex">
          {LIGACOES.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-tinta-70 transition-colors hover:text-vinho"
            >
              {l.texto}
            </Link>
          ))}
        </nav>

        <form onSubmit={submeterProcura} className="ml-auto hidden lg:block">
          <label className="sr-only" htmlFor="procura">
            Procurar peças
          </label>
          <input
            id="procura"
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
            placeholder="Procurar peça…"
            className="w-48 border-b border-areia-300 bg-transparent px-1 py-1 text-sm placeholder:text-tinta-50 focus:border-vinho focus:outline-none"
          />
        </form>

        <div className="ml-auto flex items-center gap-4 lg:ml-4">
          {equipa && (
            <Link
              href="/admin"
              className="hidden text-sm text-vinho underline-offset-4 hover:underline sm:inline"
            >
              Painel
            </Link>
          )}
          <Link
            href={utilizador ? "/conta" : "/entrar"}
            className="text-sm text-tinta-70 transition-colors hover:text-vinho"
          >
            {utilizador ? utilizador.nome.split(" ")[0] : "Entrar"}
          </Link>
          <Link
            href="/carrinho"
            className="relative text-sm text-tinta-70 transition-colors hover:text-vinho"
          >
            Carrinho
            {carregado && totalPecas > 0 && (
              <span className="absolute -top-2 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-vinho px-1 text-[0.65rem] font-semibold text-white">
                {totalPecas}
              </span>
            )}
          </Link>
        </div>
      </div>

      {menuAberto && (
        <nav className="border-t border-areia-200 bg-areia-50 md:hidden">
          <ul className="mx-auto max-w-7xl px-4 py-2">
            {LIGACOES.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block border-b border-areia-100 py-3 text-sm text-tinta"
                >
                  {l.texto}
                </Link>
              </li>
            ))}
            {equipa && (
              <li>
                <Link href="/admin" className="block py-3 text-sm text-vinho">
                  Painel de gestão
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
