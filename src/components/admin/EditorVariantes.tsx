"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { apagarVariante, guardarVariante } from "@/app/admin/acoes";
import { formatNumericDate } from "@/lib/dates";

export type VarianteAdmin = {
  id: string;
  sku: string;
  size: string;
  color: string;
  saleStock: number;
  rentalStock: number;
  active: boolean;
  disponivel: boolean;
  disponivelDe: string | null;
};

export default function EditorVariantes({
  productId,
  variantes,
}: {
  productId: string;
  variantes: VarianteAdmin[];
}) {
  const router = useRouter();
  const [aProcessar, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [aEditar, setAEditar] = useState<string | null>(null);
  const [aAdicionar, setAAdicionar] = useState(false);

  function correr(accao: () => Promise<{ ok: boolean; mensagem?: string; erro?: string }>) {
    setAviso(null);
    iniciar(async () => {
      const r = await accao();
      setAviso(
        r.ok
          ? { tipo: "ok", texto: r.mensagem ?? "Guardado." }
          : { tipo: "erro", texto: r.erro ?? "Não foi possível." }
      );
      if (r.ok) {
        setAEditar(null);
        setAAdicionar(false);
        router.refresh();
      }
    });
  }

  return (
    <section className="cartao p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">Tamanhos e stock</h2>
          <p className="mt-1 text-sm text-tinta-70">
            Cada linha é uma peça física. O stock de aluguer é o número de exemplares que tem
            para alugar — o calendário do site usa este número.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-contorno px-3 py-1.5 text-xs"
          onClick={() => {
            setAAdicionar((v) => !v);
            setAEditar(null);
          }}
        >
          {aAdicionar ? "Fechar" : "Adicionar tamanho"}
        </button>
      </div>

      {aviso && (
        <p
          className={`mt-3 border-l-2 px-3 py-2 text-sm ${
            aviso.tipo === "ok" ? "border-verde bg-areia-50" : "border-vinho bg-areia-50 text-vinho"
          }`}
        >
          {aviso.texto}
        </p>
      )}

      {aAdicionar && (
        <form
          className="mt-4 grid gap-3 border border-areia-300 bg-areia-50 p-4 sm:grid-cols-5"
          action={(fd) => correr(() => guardarVariante(fd))}
        >
          <input type="hidden" name="productId" value={productId} />
          <label className="sm:col-span-1">
            <span className="etiqueta">Tamanho</span>
            <input className="campo" name="size" required placeholder="M, 40, 6 anos" />
          </label>
          <label className="sm:col-span-2">
            <span className="etiqueta">Cor</span>
            <input className="campo" name="color" required placeholder="Bordeaux" />
          </label>
          <label>
            <span className="etiqueta">Stock venda</span>
            <input className="campo" name="saleStock" inputMode="numeric" defaultValue={0} />
          </label>
          <label>
            <span className="etiqueta">Exemplares aluguer</span>
            <input className="campo" name="rentalStock" inputMode="numeric" defaultValue={0} />
          </label>
          <div className="sm:col-span-5">
            <button type="submit" className="btn btn-principal" disabled={aProcessar}>
              Adicionar
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="tabela">
          <thead>
            <tr>
              <th>Tamanho</th>
              <th>Cor</th>
              <th>Venda</th>
              <th>Aluguer</th>
              <th>No site</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {variantes.map((v) =>
              aEditar === v.id ? (
                <tr key={v.id}>
                  <td colSpan={6} className="bg-areia-50">
                    <form
                      className="grid gap-3 p-2 sm:grid-cols-6"
                      action={(fd) => correr(() => guardarVariante(fd))}
                    >
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="productId" value={productId} />
                      <label>
                        <span className="etiqueta">Tamanho</span>
                        <input className="campo" name="size" defaultValue={v.size} required />
                      </label>
                      <label className="sm:col-span-2">
                        <span className="etiqueta">Cor</span>
                        <input className="campo" name="color" defaultValue={v.color} required />
                      </label>
                      <label>
                        <span className="etiqueta">Stock venda</span>
                        <input
                          className="campo"
                          name="saleStock"
                          inputMode="numeric"
                          defaultValue={v.saleStock}
                        />
                      </label>
                      <label>
                        <span className="etiqueta">Exemplares aluguer</span>
                        <input
                          className="campo"
                          name="rentalStock"
                          inputMode="numeric"
                          defaultValue={v.rentalStock}
                        />
                      </label>
                      <label className="flex items-end gap-2 pb-2 text-sm">
                        <input
                          type="checkbox"
                          name="active"
                          value="sim"
                          defaultChecked={v.active}
                        />
                        <span>Ativo</span>
                        <input type="hidden" name="active" value="nao" />
                      </label>
                      <div className="flex gap-2 sm:col-span-6">
                        <button type="submit" className="btn btn-principal" disabled={aProcessar}>
                          Guardar
                        </button>
                        <button
                          type="button"
                          className="btn btn-contorno"
                          onClick={() => setAEditar(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={v.id} className={v.active ? "" : "opacity-50"}>
                  <td className="font-medium">{v.size}</td>
                  <td>{v.color}</td>
                  <td>{v.saleStock}</td>
                  <td>{v.rentalStock}</td>
                  <td>
                    {!v.active ? (
                      <span className="selo bg-areia-200 text-tinta-70">Desativado</span>
                    ) : v.rentalStock === 0 ? (
                      <span className="text-xs text-tinta-50">só venda</span>
                    ) : v.disponivel ? (
                      <span className="selo bg-emerald-100 text-emerald-900">Disponível</span>
                    ) : (
                      <span className="selo bg-amber-100 text-amber-900">
                        Volta a {formatNumericDate(v.disponivelDe)}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs text-vinho hover:underline"
                        onClick={() => {
                          setAEditar(v.id);
                          setAAdicionar(false);
                        }}
                      >
                        Editar
                      </button>
                      {v.active && (
                        <button
                          type="button"
                          className="text-xs text-tinta-50 hover:text-vinho"
                          disabled={aProcessar}
                          onClick={() => correr(() => apagarVariante(v.id, productId))}
                        >
                          Desativar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
