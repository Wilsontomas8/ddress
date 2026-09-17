import { getSettings } from "@/lib/settings";
import FormularioDefinicoes from "@/components/admin/FormularioDefinicoes";
import { exigirAcesso } from "@/lib/guarda";

export const dynamic = "force-dynamic";
export const metadata = { title: "Definições" };

export default async function PaginaDefinicoes() {
  await exigirAcesso("definicoes");


  const loja = await getSettings();

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl">Definições</h1>
      <p className="mt-1 text-sm text-tinta-70">
        Dados da loja, contas de pagamento e horários do ateliê.
      </p>

      <div className="mt-8">
        <FormularioDefinicoes
          loja={{
            storeName: loja.storeName,
            tagline: loja.tagline,
            phone: loja.phone,
            whatsapp: loja.whatsapp,
            email: loja.email,
            address: loja.address,
            mapsUrl: loja.mapsUrl,
            latitude: loja.latitude,
            longitude: loja.longitude,
            bankName: loja.bankName,
            accountHolder: loja.accountHolder,
            iban: loja.iban,
            multicaixaNumber: loja.multicaixaNumber,
            deliveryFee: loja.deliveryFee,
            openDays: loja.openDays,
            openHour: loja.openHour,
            closeHour: loja.closeHour,
            slotMinutes: loja.slotMinutes,
            slotCapacity: loja.slotCapacity,
            minNoticeHours: loja.minNoticeHours,
            reservationExpiryHours: loja.reservationExpiryHours,
            bookingHorizonDays: loja.bookingHorizonDays,
            closedDates: loja.closedDates,
          }}
        />
      </div>
    </div>
  );
}
