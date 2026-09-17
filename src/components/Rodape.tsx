import Link from "next/link";

type Props = {
  loja: {
    storeName: string;
    tagline: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
  };
};

const COLUNAS = [
  {
    titulo: "Colecção",
    ligacoes: [
      { href: "/loja/mulher", texto: "Mulher" },
      { href: "/loja/homem", texto: "Homem" },
      { href: "/loja/crianca", texto: "Criança" },
      { href: "/loja?tipo=aluguer", texto: "Peças para alugar" },
    ],
  },
  {
    titulo: "Ateliê",
    ligacoes: [
      { href: "/marcacao", texto: "Marcar prova" },
      { href: "/como-funciona", texto: "Como funciona o aluguer" },
      { href: "/acompanhar", texto: "Acompanhar pedido" },
      { href: "/conta", texto: "A minha conta" },
    ],
  },
];

export default function Rodape({ loja }: Props) {
  const ano = new Date().getFullYear();
  const telefone = loja.phone.replace(/\s/g, "");
  const whatsapp = loja.whatsapp.replace(/[^\d]/g, "");

  return (
    <footer className="bg-preto text-marfim-200">
      <div className="filete-ouro" />

      <div className="mx-auto max-w-[90rem] px-4 pt-16 pb-10 sm:px-8 sm:pt-24">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/ddress-logo.png" alt={loja.storeName} className="h-24 w-auto sm:h-28" />
            <p className="mt-6 max-w-xs font-display text-xl leading-snug text-marfim-100 italic">
              A peça certa para o dia certo.
            </p>
          </div>

          {COLUNAS.map((c) => (
            <div key={c.titulo}>
              <p className="rotulo text-ouro-claro">{c.titulo}</p>
              <ul className="mt-5 space-y-3 text-sm">
                {c.ligacoes.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-marfim-200 transition-colors hover:text-ouro-claro">
                      {l.texto}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="rotulo text-ouro-claro">Contactos</p>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="text-marfim-200">{loja.address}</li>
              <li>
                <a href={`tel:${telefone}`} className="num transition-colors hover:text-ouro-claro">
                  {loja.phone}
                </a>
              </li>
              {loja.email && (
                <li>
                  <a href={`mailto:${loja.email}`} className="transition-colors hover:text-ouro-claro">
                    {loja.email}
                  </a>
                </li>
              )}
              <li className="flex gap-5 pt-1">
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-ouro-claro"
                >
                  WhatsApp
                </a>
                <a
                  href="https://www.instagram.com/ddress_aluguer_de_vestidos/"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-ouro-claro"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Assinatura em escala de página, como remate */}
        <div className="mt-20 border-t border-white/10 pt-10" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/ddress-nome.png" alt="" className="w-full max-w-5xl opacity-90" />
        </div>

        <div className="mt-10 flex flex-col gap-2 text-xs text-marfim-400 sm:flex-row sm:justify-between">
          <p>
            © {ano} {loja.storeName}. Todos os direitos reservados.
          </p>
          <p>{loja.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
