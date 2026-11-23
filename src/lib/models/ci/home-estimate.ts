// Mesken — hane bilgilerinden yıllık ve aylık elektrik tüketimi tahmini.
// Katsayılar Türkiye'deki tipik hane tüketimine göre yaklaşık değerlerdir (TÜİK/EPDK hane ortalaması
// ~2.200–2.600 kWh/yıl, doğalgazlı 3–4 kişilik hane). Amaç kaba ama tutarlı bir ön tahmindir;
// elinde fatura olan kullanıcı yıllık tüketimi doğrudan girebilir.

export interface HomeAnswers {
  people: number;                                   // hanede yaşayan kişi
  home: 'small' | 'large' | 'detached';             // ≤100 m² daire / >100 m² daire / müstakil
  heating: 'gas' | 'heatpump' | 'electric' | 'other'; // ısınma
  water: 'gas' | 'electric' | 'solar';              // sıcak su
  cooking: 'gas' | 'electric';                      // ocak / fırın
  ac: number;                                       // yazın kullanılan klima sayısı
  ev: boolean;                                      // elektrikli araç
  evKm: number;                                     // yıllık km (evde şarj)
  pool: boolean;                                    // havuz pompası
  wfh: boolean;                                     // evden çalışma
}

export const defaultHome = (): HomeAnswers => ({
  people: 3, home: 'small', heating: 'gas', water: 'gas', cooking: 'gas', ac: 1, ev: false, evKm: 12000, pool: false, wfh: false,
});

// Ay ağırlıkları (Ocak..Aralık)
const FLAT = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const HEAT = [22, 18, 14, 6, 0, 0, 0, 0, 0, 4, 13, 23];
const COOL = [0, 0, 0, 0, 4, 18, 30, 30, 15, 3, 0, 0];
const POOL = [0, 0, 0, 0, 12, 22, 24, 24, 18, 0, 0, 0];
const WATER = [11, 10, 9, 8, 7, 6, 6, 6, 7, 8, 10, 12];
const LIGHT = [11, 9, 8, 7, 6, 6, 6, 7, 8, 9, 11, 12];

export interface HomeEstimate {
  total: number;                       // kWh/yıl
  monthly: number[];                   // kWh, 12 ay
  monthlyPct: number[];                // %, toplam 100
  parts: { label: string; kwh: number }[];
}

export function estimateHome(a: HomeAnswers): HomeEstimate {
  const n = Math.max(1, Math.min(8, Math.round(a.people)));
  const size = a.home === 'small' ? 1 : a.home === 'large' ? 1.12 : 1.3;
  const heatBase = a.home === 'small' ? 1 : a.home === 'large' ? 1.4 : 2.1;
  const parts: { label: string; kwh: number; shape: number[] }[] = [];
  const add = (label: string, kwh: number, shape: number[]) => { if (kwh > 0) parts.push({ label, kwh, shape }); };

  add('Buzdolabı, aydınlatma, TV ve küçük cihazlar', (650 + 260 * n) * size, LIGHT);
  add('Çamaşır, bulaşık makinesi ve ütü', 140 + 90 * n, FLAT);
  if (a.cooking === 'electric') add('Elektrikli ocak ve fırın', 300 + 90 * n, FLAT);
  if (a.water === 'electric') add('Elektrikli termosifon (sıcak su)', 450 + 420 * n, WATER);
  if (a.water === 'solar') add('Sıcak su (güneş kolektörü destek)', 60 * n, WATER);
  if (a.heating === 'heatpump') add('Isınma — klima / ısı pompası', 1700 * heatBase, HEAT);
  if (a.heating === 'electric') add('Isınma — elektrikli ısıtıcı', 3600 * heatBase, HEAT);
  if (a.heating === 'gas' || a.heating === 'other') add('Kombi / kazan pompası ve fan', a.heating === 'gas' ? 120 : 0, HEAT);
  add('Klima (yaz soğutma)', Math.max(0, Math.round(a.ac)) * 420 * (a.home === 'detached' ? 1.2 : 1), COOL);
  if (a.ev) add('Elektrikli araç (evde şarj)', Math.max(0, a.evKm) * 0.18, FLAT);
  if (a.pool) add('Havuz pompası', 1500, POOL);
  if (a.wfh) add('Evden çalışma (bilgisayar, aydınlatma, klima)', 380, FLAT);

  const monthly = Array(12).fill(0) as number[];
  parts.forEach((p) => {
    const s = p.shape.reduce((x, y) => x + y, 0);
    p.shape.forEach((w, m) => (monthly[m] += (p.kwh * w) / s));
  });
  const total = monthly.reduce((x, y) => x + y, 0);
  // Yüzdeler: 1 ondalık, Aralık toplamı 100'e tamamlar (aylık dağılım girdisiyle aynı kural)
  const monthlyPct: number[] = [];
  let acc = 0;
  for (let m = 0; m < 11; m++) { const v = Math.round((monthly[m] / total) * 1000) / 10; monthlyPct.push(v); acc += v; }
  monthlyPct.push(Math.round((100 - acc) * 10) / 10);
  return { total, monthly, monthlyPct, parts: parts.map(({ label, kwh }) => ({ label, kwh })) };
}
