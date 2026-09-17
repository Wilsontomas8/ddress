import { ArrowDown, ArrowUp, Film, ImageIcon, Trash2 } from "lucide-react";
import { adicionarMedia, moverMedia, removerMedia } from "@/app/admin/acoes-conteudos";
import type { mediaItems } from "@/db/schema";
import BotaoAccao from "./BotaoAccao";
import FormularioAccao from "./FormularioAccao";

type Media = typeof mediaItems.$inferSelect;

/** Vídeos e imagens de uma página ou colecção: acrescentar, ordenar, remover */
export default function EditorMedia({
  ownerType,
  ownerId,
  media,
  podeEditar,
}: {
  ownerType: "PAGINA" | "COLECCAO";
  ownerId: string;
  media: Media[];
  podeEditar: boolean;
}) {
  return (
    <section className="cartao p-5">
      <h2 className="font-display text-lg">Vídeos e imagens</h2>
      <p className="mt-1 text-sm text-tinta-70">
        Use caminhos do site (ex.: /quem-somos/video.mp4) ou endereços https. Os vídeos verticais (9:16) ficam melhor.
      </p>

      {media.length === 0 ? (
        <p className="mt-5 text-sm text-tinta-50">Ainda sem vídeos nem imagens.</p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((m, i) => (
            <li key={m.id} className="border border-marfim-200 p-2">
              <div className="relative aspect-[3/4] overflow-hidden bg-marfim-100">
                {m.kind === "VIDEO" ? (
                  <video src={m.url} poster={m.poster ?? undefined} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.title} loading="lazy" className="h-full w-full object-cover" />
                )}
                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-preto/70 px-1.5 py-0.5 text-[0.625rem] text-marfim-50">
                  {m.kind === "VIDEO" ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                  {i + 1}
                </span>
              </div>
              <p className="mt-1.5 truncate text-xs text-tinta-70" title={m.url}>
                {m.title || m.url}
              </p>
              {podeEditar && (
                <div className="mt-1.5 flex gap-1">
                  <BotaoAccao acao={moverMedia.bind(null, m.id, -1)} className="btn btn-contorno px-2 py-1" rotulo="Mover para trás">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </BotaoAccao>
                  <BotaoAccao acao={moverMedia.bind(null, m.id, 1)} className="btn btn-contorno px-2 py-1" rotulo="Mover para a frente">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </BotaoAccao>
                  <BotaoAccao acao={removerMedia.bind(null, m.id)} confirmar="Remover este ficheiro da página?" className="btn btn-perigo ml-auto px-2 py-1" rotulo="Remover">
                    <Trash2 className="h-3.5 w-3.5" />
                  </BotaoAccao>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {podeEditar && (
        <FormularioAccao acao={adicionarMedia} textoBotao="Acrescentar" limpar className="mt-6 space-y-4 border-t border-marfim-200 pt-5" botaoClassName="btn btn-contorno">
          <input type="hidden" name="ownerType" value={ownerType} />
          <input type="hidden" name="ownerId" value={ownerId} />
          <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
            <label>
              <span className="etiqueta">Tipo</span>
              <select name="kind" className="campo" defaultValue="VIDEO">
                <option value="VIDEO">Vídeo</option>
                <option value="IMAGEM">Imagem</option>
              </select>
            </label>
            <label>
              <span className="etiqueta">Endereço do ficheiro</span>
              <input name="url" className="campo" placeholder="/video/novo.mp4 ou https://…" required />
            </label>
            <label className="sm:col-start-2">
              <span className="etiqueta">Imagem de capa do vídeo (opcional)</span>
              <input name="poster" className="campo" placeholder="/video/novo.jpg" />
            </label>
            <label className="sm:col-start-2">
              <span className="etiqueta">Legenda (opcional)</span>
              <input name="title" className="campo" maxLength={120} />
            </label>
          </div>
        </FormularioAccao>
      )}
    </section>
  );
}
