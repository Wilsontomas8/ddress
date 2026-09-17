import { exigirAcesso } from "@/lib/guarda";
import { listarParceiros } from "@/lib/conteudos";
import { apagarParceiro, guardarParceiro } from "@/app/admin/acoes-conteudos";
import type { Partner } from "@/db/schema";
import FormularioAccao from "@/components/admin/FormularioAccao";
import BotaoAccao from "@/components/admin/BotaoAccao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Parceiros" };

function CamposParceiro({ p }: { p?: Partner }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <label>
        <span className="etiqueta">Nome</span>
        <input name="name" className="campo" defaultValue={p?.name} required />
      </label>
      <label>
        <span className="etiqueta">Serviço</span>
        <select name="service" className="campo" defaultValue={p?.service ?? "MAQUILHAGEM"}>
          <option value="MAQUILHAGEM">Maquilhagem</option>
          <option value="OUTRO">Outro</option>
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className="etiqueta">Descrição</span>
        <textarea name="description" className="campo min-h-24" defaultValue={p?.description} />
      </label>
      <label>
        <span className="etiqueta">Logótipo</span>
        <input name="logoUrl" className="campo" defaultValue={p?.logoUrl ?? ""} placeholder="/parceiros/logo.jpg" />
      </label>
      <label>
        <span className="etiqueta">Instagram</span>
        <input name="instagram" className="campo" defaultValue={p?.instagram ?? ""} placeholder="https://www.instagram.com/…" />
      </label>
      <label>
        <span className="etiqueta">WhatsApp</span>
        <input name="whatsapp" className="campo" defaultValue={p?.whatsapp ?? ""} placeholder="+244 9…" />
      </label>
      <label>
        <span className="etiqueta">E-mail (recebe os pedidos)</span>
        <input name="email" type="email" className="campo" defaultValue={p?.email ?? ""} />
      </label>
      <label>
        <span className="etiqueta">Ordem</span>
        <input name="position" type="number" className="campo" defaultValue={p?.position ?? 0} />
      </label>
      <label className="flex items-center gap-2 self-end pb-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> Activo no site
      </label>
    </div>
  );
}

export default async function PaginaParceiros() {
  const eu = await exigirAcesso("parceiros");
  const parceiros = await listarParceiros({ incluirInactivos: true });

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl">Parceiros</h1>
      <p className="mt-1 text-sm text-tinta-70">
        Parceiras de maquilhagem e outros serviços. As clientes enviam-lhes pedidos a partir do site; a parceira recebe por e-mail quando este estiver preenchido.
      </p>

      <ul className="mt-6 space-y-4">
        {parceiros.map((p) => (
          <li key={p.id} className="cartao p-5">
            <div className="flex flex-wrap items-center gap-4">
              {p.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.logoUrl} alt="" className="h-14 w-14 bg-preto object-contain" />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl">{p.name}</h2>
                <p className="text-xs text-tinta-50">
                  {p.service === "MAQUILHAGEM" ? "Maquilhagem" : "Outro serviço"} · {p.active ? "activo" : "inactivo"}
                </p>
              </div>
              {eu.podeEditar && (
                <BotaoAccao acao={apagarParceiro.bind(null, p.id)} confirmar={`Apagar ${p.name}? Os pedidos antigos ficam guardados.`} className="btn btn-perigo">
                  Apagar
                </BotaoAccao>
              )}
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-ouro-escuro">{eu.podeEditar ? "Editar" : "Ver dados"}</summary>
              <FormularioAccao acao={guardarParceiro} podeEditar={eu.podeEditar} className="mt-4 space-y-5">
                <CamposParceiro p={p} />
              </FormularioAccao>
            </details>
          </li>
        ))}
      </ul>

      {eu.podeEditar && (
        <section className="cartao mt-8 p-5">
          <h2 className="font-display text-lg">Novo parceiro</h2>
          <FormularioAccao acao={guardarParceiro} limpar textoBotao="Criar parceiro" className="mt-4 space-y-5">
            <CamposParceiro />
          </FormularioAccao>
        </section>
      )}
    </div>
  );
}
