import FormularioSolicitacao from "@/components/FormularioSolicitacao";
import { getUtilizador } from "@/lib/auth";
import { listarParceiros } from "@/lib/conteudos";
import { ligacaoWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Maquilhagem e sapatos",
  description: "Complete o look: maquilhagem com a parceira da DDRESS e sapatos para combinar com o vestido.",
};

export default async function PaginaMaquilhagem() {
  const [parceiros, utilizador] = await Promise.all([listarParceiros({ servico: "MAQUILHAGEM" }), getUtilizador()]);
  const cliente = utilizador ? { nome: utilizador.name, telefone: utilizador.phone ?? "", email: utilizador.email } : null;

  return (
    <>
      <section className="bg-preto text-marfim-50">
        <div className="mx-auto max-w-[90rem] px-4 pt-14 pb-14 sm:px-8 sm:pt-20">
          <p className="rotulo text-ouro-claro">Complete o look</p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.95] sm:text-7xl">
            Maquilhagem <span className="texto-ouro italic">e sapatos.</span>
          </h1>
          <p className="mt-6 max-w-xl text-marfim-200">
            Escolheu o vestido? Peça a maquilhagem à nossa parceira e os sapatos à DDRESS — tratamos tudo para o mesmo dia.
          </p>
        </div>
      </section>

      {parceiros.map((p) => {
        const whatsapp = ligacaoWhatsApp(p.whatsapp, `Olá ${p.name}! Venho da DDRESS e gostaria de marcar maquilhagem.`);
        return (
          <section key={p.id} className="mx-auto grid max-w-[90rem] gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <p className="rotulo text-tinta-50">Parceira de maquilhagem</p>
              {p.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.logoUrl} alt={`Logótipo ${p.name}`} className="mt-6 w-72 max-w-full bg-preto" />
              )}
              <h2 className="mt-6 font-display text-4xl leading-none sm:text-5xl">{p.name}</h2>
              <p className="mt-5 max-w-md leading-relaxed text-tinta-70">{p.description}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {p.instagram && (
                  <a href={p.instagram} target="_blank" rel="noreferrer" className="btn btn-contorno">
                    Ver no Instagram
                  </a>
                )}
                {whatsapp && (
                  <a href={whatsapp} target="_blank" rel="noreferrer" className="btn btn-contorno">
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-display text-2xl">Pedir maquilhagem</h3>
              <p className="mt-2 mb-6 text-sm text-tinta-70">
                Diga-nos o dia e o que imagina. A DDRESS e a {p.name} confirmam consigo.
              </p>
              <FormularioSolicitacao tipo="MAQUILHAGEM" parceiros={[{ id: p.id, name: p.name }]} cliente={cliente} />
            </div>
          </section>
        );
      })}

      <section id="sapatos" className="scroll-mt-24 border-t border-marfim-200 bg-marfim-100/60">
        <div className="mx-auto grid max-w-[90rem] gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="rotulo text-tinta-50">Sapatos DDRESS</p>
            <h2 className="mt-5 font-display text-4xl leading-none sm:text-5xl">
              O par certo <span className="italic">para o vestido.</span>
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-tinta-70">
              A DDRESS também tem sapatos para comprar ou alugar. Escolha os modelos que gosta, ou diga-nos o tamanho e o vestido — sugerimos o par.
            </p>
          </div>
          <FormularioSolicitacao tipo="SAPATOS" cliente={cliente} />
        </div>
      </section>
    </>
  );
}
