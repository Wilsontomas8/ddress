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

export default function Rodape({ loja }: Props) {
  const ano = new Date().getFullYear();

  return (
    <footer className="mt-24 bg-preto text-marfim-200">
      <div className="filete-ouro" />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marca/ddress-logo.png"
            alt={loja.storeName}
            className="h-28 w-auto"
          />
          <p className="mt-3 text-sm text-marfim-400">{loja.tagline}</p>
        </div>

        <div>
          <p className="etiqueta text-ouro-claro">Comprar</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/loja/mulher" className="hover:text-ouro-claro">
                Mulher
              </Link>
            </li>
            <li>
              <Link href="/loja/homem" className="hover:text-ouro-claro">
                Homem
              </Link>
            </li>
            <li>
              <Link href="/loja/crianca" className="hover:text-ouro-claro">
                Criança
              </Link>
            </li>
            <li>
              <Link href="/loja?tipo=aluguer" className="hover:text-ouro-claro">
                Peças para alugar
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="etiqueta text-ouro-claro">Ateliê</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/marcacao" className="hover:text-ouro-claro">
                Marcar prova
              </Link>
            </li>
            <li>
              <Link href="/como-funciona" className="hover:text-ouro-claro">
                Como funciona o aluguer
              </Link>
            </li>
            <li>
              <Link href="/acompanhar" className="hover:text-ouro-claro">
                Acompanhar pedido
              </Link>
            </li>
            <li>
              <Link href="/conta" className="hover:text-ouro-claro">
                A minha conta
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="etiqueta text-ouro-claro">Contactos</p>
          <ul className="space-y-2 text-sm">
            <li>{loja.address}</li>
            <li>
              <a href={`tel:${loja.phone.replace(/\s/g, "")}`} className="hover:text-ouro-claro">
                {loja.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${loja.email}`} className="hover:text-ouro-claro">
                {loja.email}
              </a>
            </li>
            <li>
              <a
                href={`https://wa.me/${loja.whatsapp.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-ouro-claro"
              >
                WhatsApp
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/ddress_aluguer_de_vestidos/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-ouro-claro"
              >
                Instagram
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-carvao-claro">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-marfim-400">
          © {ano} {loja.storeName}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
