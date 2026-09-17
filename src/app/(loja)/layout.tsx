import Cabecalho from "@/components/Cabecalho";
import Rodape from "@/components/Rodape";
import { getSessao } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export default async function LayoutLoja({ children }: { children: React.ReactNode }) {
  const [loja, sessao] = await Promise.all([getSettings(), getSessao()]);

  return (
    <div className="flex min-h-screen flex-col">
      <Cabecalho
        nomeLoja={loja.storeName}
        utilizador={sessao ? { nome: sessao.nome, role: sessao.role } : null}
      />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <Rodape
        loja={{
          storeName: loja.storeName,
          tagline: loja.tagline,
          phone: loja.phone,
          whatsapp: loja.whatsapp,
          email: loja.email,
          address: loja.address,
          mapsUrl: loja.mapsUrl,
        }}
      />
    </div>
  );
}
