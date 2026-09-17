import { MapPin } from "lucide-react";

/**
 * Onde é a loja. O mapa vem do OpenStreetMap (sem chaves nem cookies de
 * publicidade) e o botão abre o Google Maps, para quem quer indicações.
 */
export default function MapaDaLoja({
  endereco,
  latitude,
  longitude,
  mapsUrl,
  claro = false,
}: {
  endereco: string;
  latitude: string;
  longitude: string;
  mapsUrl: string;
  /** true quando o bloco fica sobre fundo escuro */
  claro?: boolean;
}) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const temMapa = Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0);
  const d = 0.004;
  const enquadrar = `${lon - d},${lat - d / 2},${lon + d},${lat + d / 2}`;
  const ligacao = mapsUrl || (temMapa ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : "");

  return (
    <div>
      <p className={`flex items-start gap-2 text-sm ${claro ? "text-marfim-200" : "text-tinta-70"}`}>
        <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${claro ? "text-ouro-claro" : "text-ouro-escuro"}`} strokeWidth={1.6} aria-hidden="true" />
        <span>{endereco}</span>
      </p>

      {temMapa && (
        <div className={`mt-4 overflow-hidden ${claro ? "ring-1 ring-white/15" : "ring-1 ring-marfim-200"}`}>
          <iframe
            title={`Mapa: ${endereco}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="block h-64 w-full sm:h-72"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${enquadrar}&layer=mapnik&marker=${lat},${lon}`}
          />
        </div>
      )}

      {ligacao && (
        <a href={ligacao} target="_blank" rel="noreferrer" className={`btn mt-4 ${claro ? "btn-contorno-claro" : "btn-contorno"}`}>
          Abrir no Google Maps
        </a>
      )}
    </div>
  );
}
