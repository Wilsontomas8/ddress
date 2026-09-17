import { exigirAcesso } from "@/lib/guarda";
import { PAPEL } from "@/lib/labels";
import { PERFIS_AJUSTAVEIS, PERMISSOES_PADRAO, RECURSOS, SO_ADMINISTRADOR } from "@/lib/permissoes";
import { matrizDoPerfil } from "@/lib/permissoes-servidor";
import { guardarPermissoes, reporPermissoesPadrao } from "@/app/admin/acoes-conteudos";
import FormularioAccao from "@/components/admin/FormularioAccao";
import BotaoAccao from "@/components/admin/BotaoAccao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Permissões" };

const NIVEIS = [
  { valor: "nenhum", texto: "Sem acesso" },
  { valor: "ver", texto: "Ver" },
  { valor: "editar", texto: "Ver e alterar" },
];

export default async function PaginaPermissoes() {
  const eu = await exigirAcesso("permissoes");
  const matrizes = await Promise.all(PERFIS_AJUSTAVEIS.map((p) => matrizDoPerfil(p)));
  const grupos = [...new Set(RECURSOS.map((r) => r.grupo))];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Permissões</h1>
          <p className="mt-1 max-w-2xl text-sm text-tinta-70">
            Defina o que cada perfil da equipa pode ver e alterar. O administrador tem sempre acesso total; a equipa e as permissões são só dele.
            Cada alteração fica na auditoria. <span className="whitespace-nowrap">* padrão da DDRESS</span>
          </p>
        </div>
        {eu.podeEditar && (
          <BotaoAccao acao={reporPermissoesPadrao} confirmar="Repor todas as permissões no padrão da DDRESS?">
            Repor padrão
          </BotaoAccao>
        )}
      </div>

      <FormularioAccao acao={guardarPermissoes} podeEditar={eu.podeEditar} textoBotao="Guardar permissões" className="mt-6 space-y-5">
        <div className="cartao overflow-x-auto">
          <table className="tabela min-w-[52rem]">
            <thead>
              <tr>
                <th>Área</th>
                {PERFIS_AJUSTAVEIS.map((p) => (
                  <th key={p}>{PAPEL[p]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grupos.map((grupo) => (
                <FragmentoGrupo key={grupo} grupo={grupo} matrizes={matrizes} />
              ))}
            </tbody>
          </table>
        </div>
      </FormularioAccao>
    </div>
  );
}

function FragmentoGrupo({ grupo, matrizes }: { grupo: string; matrizes: Awaited<ReturnType<typeof matrizDoPerfil>>[] }) {
  return (
    <>
      <tr>
        <td colSpan={PERFIS_AJUSTAVEIS.length + 1} className="rotulo bg-marfim-100/60 text-[0.625rem] text-tinta-50">
          {grupo}
        </td>
      </tr>
      {RECURSOS.filter((r) => r.grupo === grupo).map((r) => (
        <tr key={r.chave}>
          <td>
            <span className="block font-medium">{r.texto}</span>
            <span className="block text-xs text-tinta-50">{r.descricao}</span>
          </td>
          {PERFIS_AJUSTAVEIS.map((perfil, i) =>
            SO_ADMINISTRADOR.includes(r.chave) ? (
              <td key={perfil} className="text-xs text-tinta-50">
                Só administrador
              </td>
            ) : (
              <td key={perfil}>
                <select
                  name={`perm:${perfil}:${r.chave}`}
                  defaultValue={matrizes[i][r.chave]}
                  className="campo py-1.5 text-sm"
                  aria-label={`${r.texto} — ${PAPEL[perfil]}`}
                >
                  {NIVEIS.map((n) => (
                    <option key={n.valor} value={n.valor}>
                      {n.texto}
                      {PERMISSOES_PADRAO[perfil][r.chave] === n.valor || (!PERMISSOES_PADRAO[perfil][r.chave] && n.valor === "nenhum") ? " *" : ""}
                    </option>
                  ))}
                </select>
              </td>
            )
          )}
        </tr>
      ))}
    </>
  );
}
