import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-[0.7rem] tracking-[0.18em] text-ouro-escuro uppercase">Página não encontrada</p>
      <h1 className="mt-3 font-display text-4xl">Esta peça saiu do cabide.</h1>
      <p className="mt-4 max-w-md text-sm text-tinta-70">
        O endereço que abriu não existe ou a peça deixou de estar no catálogo. Veja o que temos
        agora.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-principal">
          Voltar ao início
        </Link>
        <Link href="/loja" className="btn btn-contorno">
          Ver a colecção
        </Link>
      </div>
    </div>
  );
}
