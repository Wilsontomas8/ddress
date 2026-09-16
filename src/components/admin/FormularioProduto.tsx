"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarProduto } from "@/app/admin/acoes";
import { SECCOES } from "@/lib/labels";
import type { Offer, Section } from "@/db/schema";

type Categoria = { id: string; name: string; section: Section };

type Props = {
  produto?: {
    id: string;
    name: string;
    description: string;
    care: string | null;
    brand: string | null;
    section: Section;
    categoryId: string;
    offer: Offer;
    salePrice: number | null;
    compareAtPrice: number | null;
    rentalDayPrice: number | null;
    rentalWeekendPrice: number | null;
    rentalDeposit: number | null;
    minRentalDays: number;
    maxRentalDays: number;
    cleaningBufferDays: number;
    requiresFitting: boolean;
    featured: boolean;
    active: boolean;
  };
  imagem?: string | null;
  categorias: Categoria[];
};

export default function FormularioProduto({ produto, imagem, categorias }: Props) {
  const router = useRouter();
  const [aProcessar, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [seccao, setSeccao] = useState<Section>(produto?.section ?? "MULHER");
  const [oferta, setOferta] = useState<Offer>(produto?.offer ?? "VENDA");

  const mostraVenda = oferta === "VENDA" || oferta === "AMBOS";
  const mostraAluguer = oferta === "ALUGUER" || oferta === "AMBOS";
  const categoriasDaSeccao = categorias.filter((c) => c.section === seccao);

  return (
    <form
      className="space-y-8"
      action={(fd) => {
        setAviso(null);
        iniciar(async () => {
          const r = await guardarProduto(fd);
          if (r.ok) {
            setAviso({ tipo: "ok", texto: r.mensagem ?? "Guardado." });
            if (!produto) router.push("/admin/produtos");
            else router.refresh();
          } else {
            setAviso({ tipo: "erro", texto: r.erro });
          }
        });
      }}
    >
      {produto && <input type="hidden" name="id" value={produto.id} />}

      {/* ---------------------------------------------------- básico */}
      <section className="cartao p-5">
        <h2 className="font-display text-lg">A peça</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="etiqueta">Nome</span>
            <input className="campo" name="name" required defaultValue={produto?.name} />
          </label>

          <label>
            <span className="etiqueta">Secção</span>
            <select
              className="campo"
              name="section"
              value={seccao}
              onChange={(e) => setSeccao(e.target.value as Section)}
            >
              {SECCOES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="etiqueta">Categoria</span>
            <select
              className="campo"
              name="categoryId"
              required
              defaultValue={produto?.categoryId}
              key={seccao}
            >
              {categoriasDaSeccao.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="etiqueta">Marca (opcional)</span>
            <input className="campo" name="brand" defaultValue={produto?.brand ?? ""} />
          </label>

          <label>
            <span className="etiqueta">Imagem (caminho ou endereço)</span>
            <input
              className="campo"
              name="imagem"
              defaultValue={imagem ?? ""}
              placeholder="/img/nome-da-peca.svg"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="etiqueta">Descrição</span>
            <textarea
              className="campo"
              name="description"
              rows={4}
              defaultValue={produto?.description}
              placeholder="O que é a peça, o tecido, para que ocasião serve."
            />
          </label>

          <label className="sm:col-span-2">
            <span className="etiqueta">Conservação (opcional)</span>
            <input className="campo" name="care" defaultValue={produto?.care ?? ""} />
          </label>
        </div>
      </section>

      {/* ---------------------------------------------------- preços */}
      <section className="cartao p-5">
        <h2 className="font-display text-lg">Venda e aluguer</h2>

        <label className="mt-4 block max-w-64">
          <span className="etiqueta">Esta peça é para…</span>
          <select
            className="campo"
            name="offer"
            value={oferta}
            onChange={(e) => setOferta(e.target.value as Offer)}
          >
            <option value="VENDA">Só venda</option>
            <option value="ALUGUER">Só aluguer</option>
            <option value="AMBOS">Venda e aluguer</option>
          </select>
        </label>

        {mostraVenda && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="etiqueta">Preço de venda (Kz)</span>
              <input
                className="campo"
                name="salePrice"
                inputMode="numeric"
                defaultValue={produto?.salePrice ?? ""}
              />
            </label>
            <label>
              <span className="etiqueta">Preço antes da promoção (Kz)</span>
              <input
                className="campo"
                name="compareAtPrice"
                inputMode="numeric"
                defaultValue={produto?.compareAtPrice ?? ""}
              />
            </label>
          </div>
        )}

        {mostraAluguer && (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label>
              <span className="etiqueta">Aluguer por dia (Kz)</span>
              <input
                className="campo"
                name="rentalDayPrice"
                inputMode="numeric"
                defaultValue={produto?.rentalDayPrice ?? ""}
              />
            </label>
            <label>
              <span className="etiqueta">Pacote fim-de-semana (Kz)</span>
              <input
                className="campo"
                name="rentalWeekendPrice"
                inputMode="numeric"
                defaultValue={produto?.rentalWeekendPrice ?? ""}
              />
            </label>
            <label>
              <span className="etiqueta">Caução (Kz)</span>
              <input
                className="campo"
                name="rentalDeposit"
                inputMode="numeric"
                defaultValue={produto?.rentalDeposit ?? ""}
              />
            </label>
            <label>
              <span className="etiqueta">Mínimo de dias</span>
              <input
                className="campo"
                name="minRentalDays"
                inputMode="numeric"
                defaultValue={produto?.minRentalDays ?? 1}
              />
            </label>
            <label>
              <span className="etiqueta">Máximo de dias</span>
              <input
                className="campo"
                name="maxRentalDays"
                inputMode="numeric"
                defaultValue={produto?.maxRentalDays ?? 14}
              />
            </label>
            <label>
              <span className="etiqueta">Dias de higienização</span>
              <input
                className="campo"
                name="cleaningBufferDays"
                inputMode="numeric"
                defaultValue={produto?.cleaningBufferDays ?? 2}
              />
              <span className="mt-1 block text-xs text-tinta-50">
                Dias em que a peça fica indisponível depois de voltar.
              </span>
            </label>
          </div>
        )}
      </section>

      {/* --------------------------------------------------- opções */}
      <section className="cartao p-5">
        <h2 className="font-display text-lg">Opções</h2>
        <div className="mt-4 space-y-3 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="requiresFitting"
              value="sim"
              defaultChecked={produto?.requiresFitting}
              className="mt-0.5"
            />
            <span>
              Exige prova no ateliê antes de confirmar o aluguer
              <span className="block text-xs text-tinta-50">
                O cliente é obrigado a escolher um horário antes de finalizar.
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="featured"
              value="sim"
              defaultChecked={produto?.featured}
            />
            <span>Mostrar em destaque na página inicial</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="active"
              value="sim"
              defaultChecked={produto?.active ?? true}
            />
            <span>Visível no site</span>
          </label>
          <input type="hidden" name="active" value="nao" />
        </div>
      </section>

      {aviso && (
        <p
          className={`border-l-2 px-3 py-2 text-sm ${
            aviso.tipo === "ok" ? "border-verde bg-areia-100" : "border-vinho bg-areia-100 text-vinho"
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <button type="submit" className="btn btn-principal" disabled={aProcessar}>
        {aProcessar ? "A guardar…" : produto ? "Guardar alterações" : "Criar peça"}
      </button>
    </form>
  );
}
