"use client";

import { useState, useTransition } from "react";
import { guardarDefinicoes } from "@/app/admin/acoes";
import { DIAS_SEMANA } from "@/lib/dates";

type Props = {
  loja: {
    storeName: string;
    tagline: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    mapsUrl: string;
    latitude: string;
    longitude: string;
    bankName: string;
    accountHolder: string;
    iban: string;
    multicaixaNumber: string;
    deliveryFee: number;
    openDays: number[];
    openHour: string;
    closeHour: string;
    slotMinutes: number;
    slotCapacity: number;
    minNoticeHours: number;
    bookingHorizonDays: number;
    reservationExpiryHours: number;
    assistantEnabled: boolean;
    assistantName: string;
    assistantGreeting: string;
    closedDates: string[];
  };
};

export default function FormularioDefinicoes({ loja }: Props) {
  const [aProcessar, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  return (
    <form
      className="space-y-8"
      action={(fd) => {
        setAviso(null);
        iniciar(async () => {
          const r = await guardarDefinicoes(fd);
          setAviso(
            r.ok
              ? { tipo: "ok", texto: r.mensagem ?? "Guardado." }
              : { tipo: "erro", texto: r.erro }
          );
        });
      }}
    >
      {/* ----------------------------------------------------- loja */}
      <section className="cartao p-5">
        <h2 className="font-display text-lg">A loja</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="etiqueta">Nome</span>
            <input className="campo" name="storeName" defaultValue={loja.storeName} />
          </label>
          <label>
            <span className="etiqueta">Frase de apresentação</span>
            <input className="campo" name="tagline" defaultValue={loja.tagline} />
          </label>
          <label className="sm:col-span-2">
            <span className="etiqueta">Morada</span>
            <input className="campo" name="address" defaultValue={loja.address} />
          </label>
          <label className="sm:col-span-2">
            <span className="etiqueta">Ligação do Google Maps</span>
            <input className="campo" name="mapsUrl" defaultValue={loja.mapsUrl} placeholder="https://www.google.com/maps/place/…" />
          </label>
          <label>
            <span className="etiqueta">Latitude do ateliê</span>
            <input className="campo num" name="latitude" defaultValue={loja.latitude} placeholder="-8.8403748" />
          </label>
          <label>
            <span className="etiqueta">Longitude do ateliê</span>
            <input className="campo num" name="longitude" defaultValue={loja.longitude} placeholder="13.2308365" />
          </label>
          <label>
            <span className="etiqueta">Telefone</span>
            <input className="campo" name="phone" defaultValue={loja.phone} />
          </label>
          <label>
            <span className="etiqueta">WhatsApp</span>
            <input className="campo" name="whatsapp" defaultValue={loja.whatsapp} />
          </label>
          <label>
            <span className="etiqueta">E-mail</span>
            <input className="campo" name="email" defaultValue={loja.email} />
          </label>
          <label>
            <span className="etiqueta">Taxa de entrega em Luanda (Kz)</span>
            <input
              className="campo"
              name="deliveryFee"
              inputMode="numeric"
              defaultValue={loja.deliveryFee}
            />
          </label>
        </div>
      </section>

      {/* ------------------------------------------------ pagamentos */}
      <section className="cartao p-5">
        <h2 className="font-display text-lg">Dados de pagamento</h2>
        <p className="mt-1 text-sm text-tinta-70">
          É isto que o cliente vê no checkout e na página do pedido.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="etiqueta">Banco</span>
            <input className="campo" name="bankName" defaultValue={loja.bankName} />
          </label>
          <label>
            <span className="etiqueta">Titular da conta</span>
            <input className="campo" name="accountHolder" defaultValue={loja.accountHolder} />
          </label>
          <label>
            <span className="etiqueta">IBAN</span>
            <input className="campo" name="iban" defaultValue={loja.iban} />
          </label>
          <label>
            <span className="etiqueta">Número do Multicaixa Express</span>
            <input
              className="campo"
              name="multicaixaNumber"
              defaultValue={loja.multicaixaNumber}
            />
          </label>
        </div>
      </section>

      {/* --------------------------------------------------- ateliê */}
      <section className="cartao p-5">
        <h2 className="font-display text-lg">Agenda do ateliê</h2>
        <p className="mt-1 text-sm text-tinta-70">
          Define os horários que o site oferece aos clientes para marcarem provas.
        </p>

        <div className="mt-4">
          <span className="etiqueta">Dias abertos</span>
          <div className="flex flex-wrap gap-3">
            {DIAS_SEMANA.map((nome, i) => (
              <label key={i} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name={`dia-${i}`}
                  value="sim"
                  defaultChecked={loja.openDays.includes(i)}
                />
                <span>{nome}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label>
            <span className="etiqueta">Abre às</span>
            <input type="time" className="campo" name="openHour" defaultValue={loja.openHour} />
          </label>
          <label>
            <span className="etiqueta">Fecha às</span>
            <input type="time" className="campo" name="closeHour" defaultValue={loja.closeHour} />
          </label>
          <label>
            <span className="etiqueta">Duração da prova (minutos)</span>
            <input
              className="campo"
              name="slotMinutes"
              inputMode="numeric"
              defaultValue={loja.slotMinutes}
            />
          </label>
          <label>
            <span className="etiqueta">Provas em simultâneo (cabines)</span>
            <input
              className="campo"
              name="slotCapacity"
              inputMode="numeric"
              defaultValue={loja.slotCapacity}
            />
          </label>
          <label>
            <span className="etiqueta">Antecedência mínima (horas)</span>
            <input
              className="campo"
              name="minNoticeHours"
              inputMode="numeric"
              defaultValue={loja.minNoticeHours}
            />
          </label>
          <label>
            <span className="etiqueta">Marcações até quantos dias à frente</span>
            <input
              className="campo"
              name="bookingHorizonDays"
              inputMode="numeric"
              defaultValue={loja.bookingHorizonDays}
            />
          </label>
          <label>
            <span className="etiqueta">Reserva expira sem prova (horas antes)</span>
            <input
              className="campo"
              name="reservationExpiryHours"
              inputMode="numeric"
              defaultValue={loja.reservationExpiryHours}
              aria-describedby="ajuda-expiracao"
            />
            <span id="ajuda-expiracao" className="mt-1 block text-xs text-tinta-50">
              Se faltarem estas horas para o levantamento e não houver prova marcada até lá, a reserva é cancelada e a peça volta ao site.
            </span>
          </label>
        </div>

        <label className="mt-5 block">
          <span className="etiqueta">Dias fechados (feriados)</span>
          <textarea
            className="campo"
            name="closedDates"
            rows={2}
            defaultValue={loja.closedDates.join(", ")}
            placeholder="2026-11-02, 2026-12-25"
          />
          <span className="mt-1 block text-xs text-tinta-50">
            Um por linha ou separados por vírgula, no formato ano-mês-dia.
          </span>
        </label>
      </section>

      {/* --------------------------------------- assistente comercial */}
      <section className="cartao p-5">
        <h2 className="font-display text-lg">Assistente comercial do site</h2>
        <p className="mt-1 text-sm text-tinta-70">
          A janela de conversa que aparece nas páginas da loja. Responde a partir destas definições (morada, horário,
          entrega, contactos) e, quando não sabe, passa a conversa para o WhatsApp da loja.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 self-end pb-3 text-sm sm:col-span-2">
            <input type="checkbox" name="assistantEnabled" defaultChecked={loja.assistantEnabled} /> Mostrar a assistente no site
          </label>
          <label>
            <span className="etiqueta">Nome</span>
            <input className="campo" name="assistantName" defaultValue={loja.assistantName} maxLength={40} />
          </label>
          <label className="sm:col-span-2">
            <span className="etiqueta">Primeira frase</span>
            <textarea className="campo min-h-20" name="assistantGreeting" defaultValue={loja.assistantGreeting} maxLength={300} />
          </label>
        </div>
      </section>

      {aviso && (
        <p
          className={`border-l-2 px-3 py-2 text-sm ${
            aviso.tipo === "ok" ? "border-verde bg-marfim-100" : "border-ouro bg-marfim-100 text-ouro-escuro"
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <button type="submit" className="btn btn-principal" disabled={aProcessar}>
        {aProcessar ? "A guardar…" : "Guardar definições"}
      </button>
    </form>
  );
}
