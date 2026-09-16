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
    <footer className="mt-24 border-t border-areia-200 bg-areia-100">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-xl">{loja.storeName}</p>
          <p className="mt-2 text-sm text-tinta-70">{loja.tagline}</p>
        </div>

        <div>
          <p className="etiqueta">Comprar</p>
          <ul className="space-y-2 text-sm text-tinta-70">
            <li>
              <Link href="/loja/mulher" className="hover:text-vinho">
                Mulher
              </Link>
            </li>
            <li>
              <Link href="/loja/homem" className="hover:text-vinho">
                Homem
              </Link>
            </li>
            <li>
              <Link href="/loja/crianca" className="hover:text-vinho">
                Criança
              </Link>
            </li>
            <li>
              <Link href="/loja?tipo=aluguer" className="hover:text-vinho">
                Peças para alugar
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="etiqueta">Ateliê</p>
          <ul className="space-y-2 text-sm text-tinta-70">
            <li>
              <Link href="/marcacao" className="hover:text-vinho">
                Marcar prova
              </Link>
            </li>
            <li>
              <Link href="/como-funciona" className="hover:text-vinho">
                Como funciona o aluguer
              </Link>
            </li>
            <li>
              <Link href="/conta" className="hover:text-vinho">
                Os meus pedidos
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="etiqueta">Contactos</p>
          <ul className="space-y-2 text-sm text-tinta-70">
            <li>{loja.address}</li>
            <li>
              <a href={`tel:${loja.phone.replace(/\s/g, "")}`} className="hover:text-vinho">
                {loja.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${loja.email}`} className="hover:text-vinho">
                {loja.email}
              </a>
            </li>
            <li>
              <a
                href={`https://wa.me/${loja.whatsapp.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-vinho"
              >
                WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-areia-200">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-tinta-50">
          © {ano} {loja.storeName}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
