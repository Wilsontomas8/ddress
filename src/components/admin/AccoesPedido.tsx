"use client";

import { useState, useTransition } from "react";
import {
  assumirPedido,
  confirmarPagamento,
  devolverCaucao,
  guardarNotaPedido,
  mudarEstadoPedido,
  registarPagamento,
} from "@/app/admin/acoes";
import { ESTADO_PEDIDO, METODO_PAGAMENTO } from "@/lib/labels";
import type { OrderStatus, PaymentMethod } from "@/db/schema";
import { formatKz } from "@/lib/money";

type Props = {
  pedido: {
    id: string;
    status: OrderStatus;
    total: number;
    depositTotal: number;
    paymentMethod: PaymentMethod;
    assignedToId: string | null;
    staffNote: string | null;
  };
  proximosEstados: OrderStatus[];
  porValidar: { id: string; amount: number; reference: string | null }[];
  souEu: boolean;
  jaPago: number;
  /** Já há factura do CEGID anexada a este pedido? */
  temFactura: boolean;
};

/** Estados a partir dos quais a factura do CEGID já devia estar anexada */
const ESTADOS_COM_FACTURA: OrderStatus[] = ["PAGO", "PRONTO", "ENTREGUE", "EM_ALUGUER", "DEVOLVIDO", "CONCLUIDO"];

export default function AccoesPedido({
  pedido,
  proximosEstados,
  porValidar,
  souEu,
  jaPago,
  temFactura,
}: Props) {
  const [aProcessar, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [novoEstado, setNovoEstado] = useState<OrderStatus | "">("");

  function correr(accao: () => Promise<{ ok: boolean; mensagem?: string; erro?: string }>) {
    setAviso(null);
    iniciar(async () => {
      const r = await accao();
      setAviso(
        r.ok
          ? { tipo: "ok", texto: r.mensagem ?? "Feito." }
          : { tipo: "erro", texto: r.erro ?? "Não foi possível concluir." }
      );
    });
  }

  const emFalta = Math.max(0, pedido.total - jaPago);
  const faltaFactura = !temFactura && ESTADOS_COM_FACTURA.includes(pedido.status);

  return (
    <div className="space-y-6">
      {faltaFactura && (
        <p className="border-l-2 border-ouro bg-marfim-100 px-3 py-2 text-sm">
          Falta registar o número da <strong>factura do CEGID</strong>.{" "}
          <a href="#documentos" className="text-ouro-escuro underline underline-offset-4">
            Registar agora
          </a>
        </p>
      )}
      {aviso && (
        <p
          className={`border-l-2 px-3 py-2 text-sm ${
            aviso.tipo === "ok"
              ? "border-verde bg-marfim-100"
              : "border-ouro bg-marfim-100 text-ouro-escuro"
          }`}
        >
          {aviso.texto}
        </p>
      )}

      {/* --------------------------------------------------- assumir */}
      {!souEu && (
        <div className="cartao p-5">
          <h3 className="font-display text-lg">Receber o pedido</h3>
          <p className="mt-1 text-sm text-tinta-70">
            {pedido.assignedToId
              ? "Este pedido já está com outro colega. Pode assumi-lo se for você a tratar dele."
              : "Assuma o pedido para ficar responsável por ele."}
          </p>
          <button
            type="button"
            className="btn btn-principal mt-4"
            disabled={aProcessar}
            onClick={() => correr(() => assumirPedido(pedido.id))}
          >
            Assumir pedido
          </button>
        </div>
      )}

      {/* ---------------------------------------------------- estado */}
      <div className="cartao p-5">
        <h3 className="font-display text-lg">Andamento</h3>
        <p className="mt-1 text-sm text-tinta-70">
          Estado atual: <strong>{ESTADO_PEDIDO[pedido.status].label}</strong>
        </p>

        {proximosEstados.length === 0 ? (
          <p className="mt-3 text-sm text-tinta-50">Este pedido está fechado.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <select
              className="campo max-w-56"
              aria-label="Passar o pedido ao estado"
              value={novoEstado}
              onChange={(e) => setNovoEstado(e.target.value as OrderStatus)}
            >
              <option value="">Passar a…</option>
              {proximosEstados.map((s) => (
                <option key={s} value={s}>
                  {ESTADO_PEDIDO[s].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-escuro"
              disabled={!novoEstado || aProcessar}
              onClick={() => {
                if (!novoEstado) return;
                correr(() => mudarEstadoPedido(pedido.id, novoEstado));
                setNovoEstado("");
              }}
            >
              Aplicar
            </button>
          </div>
        )}

        <p className="mt-3 text-xs text-tinta-50">
          Ao confirmar, a peça de aluguer fica reservada. Ao marcar como devolvida, volta a
          ficar disponível no site.
        </p>
      </div>

      {/* ------------------------------------------------ comprovativos */}
      {porValidar.length > 0 && (
        <div className="cartao p-5">
          <h3 className="font-display text-lg">Comprovativos por validar</h3>
          <ul className="mt-3 space-y-2">
            {porValidar.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span>
                  {formatKz(p.amount)}
                  {p.reference ? ` · ref. ${p.reference}` : ""}
                </span>
                <button
                  type="button"
                  className="btn btn-contorno ml-auto px-3 py-1 text-xs"
                  disabled={aProcessar}
                  onClick={() => correr(() => confirmarPagamento(p.id))}
                >
                  Confirmar recebimento
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* -------------------------------------------------- pagamento */}
      <form
        className="cartao p-5"
        action={(fd) => correr(() => registarPagamento(fd))}
      >
        <h3 className="font-display text-lg">Registar pagamento</h3>
        <p className="mt-1 text-sm text-tinta-70">
          Em falta: <strong>{formatKz(emFalta)}</strong> de {formatKz(pedido.total)}
        </p>

        <input type="hidden" name="orderId" value={pedido.id} />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="etiqueta">Valor recebido (Kz)</span>
            <input
              className="campo"
              name="valor"
              inputMode="numeric"
              defaultValue={emFalta || pedido.total}
            />
          </label>
          <label>
            <span className="etiqueta">Método</span>
            <select className="campo" name="metodo" defaultValue={pedido.paymentMethod}>
              {Object.entries(METODO_PAGAMENTO).map(([valor, m]) => (
                <option key={valor} value={valor}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="etiqueta">Referência (opcional)</span>
            <input className="campo" name="referencia" placeholder="Ex.: MCX 883100" />
          </label>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" name="confirmar" value="sim" defaultChecked />
          <span>O dinheiro já entrou (confirmar de imediato)</span>
        </label>

        <button type="submit" className="btn btn-principal mt-4" disabled={aProcessar}>
          Registar pagamento
        </button>
      </form>

      {/* ---------------------------------------------------- caução */}
      {pedido.depositTotal > 0 && (
        <form className="cartao p-5" action={(fd) => correr(() => devolverCaucao(fd))}>
          <h3 className="font-display text-lg">Devolver a caução</h3>
          <p className="mt-1 text-sm text-tinta-70">
            Caução cobrada: <strong>{formatKz(pedido.depositTotal)}</strong>. Devolva o valor
            total, ou menos, se houver estragos.
          </p>

          <input type="hidden" name="orderId" value={pedido.id} />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="etiqueta">Valor a devolver (Kz)</span>
              <input
                className="campo"
                name="valor"
                inputMode="numeric"
                defaultValue={pedido.depositTotal}
              />
            </label>
            <label>
              <span className="etiqueta">Motivo, se retiver algum valor</span>
              <input className="campo" name="motivo" placeholder="Ex.: nódoa na bainha" />
            </label>
          </div>

          <button type="submit" className="btn btn-contorno mt-4" disabled={aProcessar}>
            Registar devolução da caução
          </button>
        </form>
      )}

      {/* ------------------------------------------------------ nota */}
      <form className="cartao p-5" action={(fd) => correr(() => guardarNotaPedido(fd))}>
        <h3 className="font-display text-lg">Nota interna</h3>
        <p className="mt-1 text-sm text-tinta-70">O cliente não vê esta nota.</p>
        <input type="hidden" name="orderId" value={pedido.id} />
        <textarea
          className="campo mt-3"
          name="nota"
          rows={3}
          defaultValue={pedido.staffNote ?? ""}
          placeholder="Ex.: cliente pediu para apertar a cintura 2 cm."
        />
        <button type="submit" className="btn btn-contorno mt-3" disabled={aProcessar}>
          Guardar nota
        </button>
      </form>
    </div>
  );
}
