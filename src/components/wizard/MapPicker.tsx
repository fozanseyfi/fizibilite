'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Crosshair, Search } from 'lucide-react';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const useMapEvents = (cb: (e: { latlng: { lat: number; lon: number } }) => void) => cb; // type stub

/** Tıklanınca marker'ı taşıyan iç komponent — react-leaflet hooks SSR-safe değil, dynamic gerek */
const ClickLayer = dynamic(
  () =>
    import('react-leaflet').then((mod) => {
      const ClickHandler = ({ onPick }: { onPick: (lat: number, lon: number) => void }) => {
        mod.useMapEvents({
          click(e: { latlng: { lat: number; lng: number } }) {
            onPick(e.latlng.lat, e.latlng.lng);
          },
        });
        return null;
      };
      return ClickHandler;
    }),
  { ssr: false }
);

const CITY_PRESETS: Array<{ name: string; lat: number; lon: number }> = [
  { name: 'Antalya', lat: 36.8969, lon: 30.7133 },
  { name: 'Konya', lat: 37.8746, lon: 32.4932 },
  { name: 'İzmir', lat: 38.4192, lon: 27.1287 },
  { name: 'İstanbul', lat: 41.0082, lon: 28.9784 },
  { name: 'Ankara', lat: 39.9334, lon: 32.8597 },
  { name: 'Adana', lat: 37.0, lon: 35.3213 },
  { name: 'Şanlıurfa', lat: 37.1591, lon: 38.7969 },
  { name: 'Mersin', lat: 36.8121, lon: 34.6415 },
  { name: 'Gaziantep', lat: 37.0662, lon: 37.3833 },
  { name: 'Diyarbakır', lat: 37.9144, lon: 40.2306 },
];

interface MapPickerProps {
  lat: number;
  lon: number;
  city?: string;
  onChange: (next: { lat: number; lon: number; city?: string }) => void;
}

export function MapPicker({ lat, lon, city, onChange }: MapPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [icon, setIcon] = useState<unknown>(null);

  useEffect(() => {
    setMounted(true);
    // Leaflet'in default icon path'i Webpack/Next ile bozulur — manuel oluştur
    void import('leaflet').then((L) => {
      const customIcon = L.icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
  <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 28 16 28s16-16 16-28C32 7.16 24.84 0 16 0z" fill="#f59e0b" stroke="#b45309" stroke-width="1.5"/>
  <circle cx="16" cy="16" r="6" fill="white"/>
</svg>`),
        iconSize: [32, 44],
        iconAnchor: [16, 44],
        popupAnchor: [0, -44],
      });
      setIcon(customIcon);
    });
  }, []);

  const center = useMemo<[number, number]>(() => [lat || 38.5, lon || 35.5], [lat, lon]);

  async function geocode() {
    if (!searchQuery.trim()) return;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&q=${encodeURIComponent(searchQuery.trim())}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'GES-Fizibilite-Pro/1.0' } });
      if (!res.ok) return;
      const arr = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (arr.length === 0) return;
      const first = arr[0];
      const nlat = parseFloat(first.lat);
      const nlon = parseFloat(first.lon);
      onChange({ lat: nlat, lon: nlon, city: first.display_name.split(',')[0]?.trim() });
    } catch {
      // sessiz fail — manuel girilebilir
    }
  }

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => {
      onChange({ lat: p.coords.latitude, lon: p.coords.longitude });
    });
  }

  return (
    <div className="space-y-3">
      {/* Şehir presetleri + arama */}
      <div className="flex flex-wrap gap-1.5">
        {CITY_PRESETS.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => onChange({ lat: c.lat, lon: c.lon, city: c.name })}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
              city === c.name
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-foreground/70 hover:bg-secondary hover:text-foreground'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); geocode(); } }}
            placeholder="Adres / mahalle / ilçe ara (OpenStreetMap)..."
            className="w-full pl-8 pr-3 h-9 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          type="button"
          onClick={geocode}
          className="h-9 px-3 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-xs font-semibold transition-colors"
        >
          Ara
        </button>
        <button
          type="button"
          onClick={locateMe}
          className="h-9 px-2.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 transition-colors inline-flex items-center gap-1 text-xs"
          title="Mevcut konumumu kullan"
        >
          <Crosshair className="h-3.5 w-3.5" /> Konumum
        </button>
      </div>

      {/* Harita */}
      <div className="relative h-[340px] rounded-md overflow-hidden border border-border bg-secondary/30">
        {mounted && icon ? (
          <MapContainer
            key={`${center[0].toFixed(4)}_${center[1].toFixed(4)}`}
            center={center}
            zoom={8}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[lat, lon]} icon={icon as unknown as undefined} />
            <ClickLayer onPick={(nlat: number, nlon: number) => onChange({ lat: nlat, lon: nlon, city: undefined })} />
          </MapContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Harita yükleniyor…
          </div>
        )}
      </div>

      {/* Koordinat satırı */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="border border-border rounded-md bg-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Enlem</div>
          <div className="flex items-center gap-2 mt-0.5">
            <MapPin className="h-3 w-3 text-primary" />
            <input
              type="number"
              step="0.0001"
              value={Number.isFinite(lat) ? lat.toFixed(4) : ''}
              onChange={(e) => onChange({ lat: parseFloat(e.target.value), lon })}
              className="font-mono font-semibold tabular-nums bg-transparent border-none focus:outline-none w-full"
            />
          </div>
        </div>
        <div className="border border-border rounded-md bg-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Boylam</div>
          <div className="flex items-center gap-2 mt-0.5">
            <MapPin className="h-3 w-3 text-primary" />
            <input
              type="number"
              step="0.0001"
              value={Number.isFinite(lon) ? lon.toFixed(4) : ''}
              onChange={(e) => onChange({ lat, lon: parseFloat(e.target.value) })}
              className="font-mono font-semibold tabular-nums bg-transparent border-none focus:outline-none w-full"
            />
          </div>
        </div>
      </div>

      <p className="text-[10.5px] text-muted-foreground">
        💡 Haritaya tıklayarak konumu ayarlayın, şehir kartlarını veya arama kutusunu kullanın.
        Koordinatlar PVGIS-SARAH3 saatlik üretim verisi için kullanılır.
      </p>
    </div>
  );
}
