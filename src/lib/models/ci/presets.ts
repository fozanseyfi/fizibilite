// C&I / Mesken modeli — tüketim profili ön ayarları ve yardımcıları.
// Kaynak: "C&I Saatlik Mahsuplaşma Fizibilite Kokpiti" HTML'i.

export const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Aylık güneş üretim dağılımı (% yıl) */
export const SOLAR_M = [4.6, 5.6, 8.2, 9.6, 11.0, 11.6, 12.0, 11.4, 9.6, 7.2, 5.2, 4.0];

/** Gün eğrisi — güney (öğle tepeli) */
export const SUN_S = [0, 0, 0, 0, 0, 0.2, 1.5, 4.5, 7.5, 10, 11.8, 12.6, 12.6, 11.8, 10, 7.5, 4.8, 2.4, 0.8, 0, 0, 0, 0, 0];
/** Gün eğrisi — doğu-batı (yayvan) */
export const SUN_EW = [0, 0, 0, 0, 0, 0.6, 3.2, 6.2, 8.2, 9.2, 9.6, 9.7, 9.7, 9.6, 9.2, 8.4, 7, 4.6, 2, 0.8, 0, 0, 0, 0];

export function norm(a: number[]): number[] {
  const s = a.reduce((x, y) => x + y, 0);
  return a.map((v) => v / s);
}

export type ProfileKey = 'ofis' | 'tekvardiya' | 'fabrika' | 'otel' | 'soguk' | 'm_aksam' | 'm_gece' | 'm_gunduz' | 'm_hs';

export const PROFILE_LABELS: Record<ProfileKey, string> = {
  ofis: 'Ofis 5×8 — klasik kötü uyum',
  tekvardiya: 'Sanayi tek vardiya (08–18)',
  fabrika: 'Fabrika 3 vardiya — 24/7',
  otel: 'Otel — akşam pik',
  soguk: 'Soğuk hava deposu — düz yük',
  m_aksam: 'Mesken — gündüz sınırlı, akşam pik',
  m_gece: 'Mesken — gece yoğun (EV/ısı pompası)',
  m_gunduz: 'Mesken — gündüz yoğun (evden çalışma)',
  m_hs: 'Mesken — hafta sonu yoğun',
};

export const PROFILES: Record<ProfileKey, { wd: number[]; we: number[] }> = {
  ofis: { wd: [18, 18, 18, 18, 18, 20, 30, 55, 85, 95, 100, 100, 90, 95, 100, 95, 85, 60, 35, 25, 22, 20, 18, 18], we: [15, 15, 15, 15, 15, 15, 18, 20, 22, 25, 25, 25, 25, 25, 25, 22, 20, 18, 16, 15, 15, 15, 15, 15] },
  tekvardiya: { wd: [15, 15, 15, 15, 15, 20, 40, 80, 100, 100, 100, 95, 90, 100, 100, 100, 95, 70, 35, 20, 18, 16, 15, 15], we: [15, 15, 15, 15, 15, 15, 18, 25, 30, 30, 30, 28, 25, 25, 25, 22, 20, 18, 16, 15, 15, 15, 15, 15] },
  fabrika: { wd: [88, 88, 88, 88, 88, 90, 95, 100, 100, 100, 100, 98, 95, 100, 100, 100, 98, 95, 92, 90, 90, 88, 88, 88], we: [85, 85, 85, 85, 85, 85, 88, 90, 90, 90, 90, 88, 86, 88, 88, 88, 86, 86, 85, 85, 85, 85, 85, 85] },
  otel: { wd: [55, 50, 48, 48, 50, 58, 75, 85, 70, 55, 50, 50, 52, 50, 52, 58, 70, 88, 100, 100, 95, 85, 70, 60], we: [60, 55, 52, 52, 55, 62, 80, 92, 80, 62, 55, 55, 58, 55, 58, 64, 76, 92, 100, 100, 98, 90, 75, 65] },
  soguk: { wd: [92, 92, 92, 92, 92, 94, 96, 100, 102, 104, 106, 108, 108, 108, 106, 104, 102, 100, 96, 94, 92, 92, 92, 92], we: [92, 92, 92, 92, 92, 94, 96, 100, 102, 104, 106, 108, 108, 108, 106, 104, 102, 100, 96, 94, 92, 92, 92, 92] },
  m_aksam: { wd: [30, 25, 22, 22, 24, 30, 45, 55, 40, 32, 30, 30, 32, 32, 34, 40, 55, 80, 100, 100, 95, 85, 65, 45], we: [35, 30, 26, 25, 27, 32, 45, 60, 55, 45, 42, 44, 46, 44, 44, 48, 60, 82, 100, 100, 96, 88, 70, 50] },
  m_gece: { wd: [85, 90, 95, 95, 90, 70, 50, 45, 32, 26, 25, 25, 26, 26, 28, 34, 45, 60, 75, 85, 95, 100, 100, 95], we: [85, 90, 95, 95, 90, 72, 52, 50, 40, 34, 32, 33, 34, 33, 34, 40, 50, 64, 78, 88, 96, 100, 100, 95] },
  m_gunduz: { wd: [28, 24, 22, 22, 24, 32, 50, 65, 75, 85, 92, 96, 98, 96, 94, 90, 85, 90, 95, 90, 75, 60, 45, 34], we: [30, 26, 24, 24, 26, 34, 50, 66, 76, 86, 92, 96, 98, 96, 94, 90, 86, 90, 96, 92, 78, 62, 46, 36] },
  m_hs: { wd: [30, 25, 22, 22, 24, 30, 45, 55, 40, 32, 30, 30, 32, 32, 34, 40, 55, 80, 100, 100, 95, 85, 65, 45], we: [38, 32, 28, 27, 30, 36, 52, 70, 72, 66, 64, 66, 68, 66, 66, 70, 80, 95, 100, 100, 98, 92, 75, 55] },
};

export const WE_RATIO: Record<ProfileKey, number> = {
  ofis: 30, tekvardiya: 30, fabrika: 92, otel: 105, soguk: 100, m_aksam: 110, m_gece: 100, m_gunduz: 100, m_hs: 145,
};

export type SeasonKey = 'flat' | 'yaz' | 'kis';
export const SEASON: Record<SeasonKey, number[]> = {
  flat: Array(12).fill(1),
  yaz: [0.9, 0.9, 0.95, 1.0, 1.08, 1.18, 1.25, 1.25, 1.1, 0.98, 0.92, 0.9],
  kis: [1.2, 1.15, 1.05, 0.95, 0.9, 0.88, 0.88, 0.88, 0.92, 1.0, 1.1, 1.2],
};

/** Diziyi %'ye çevirir; son hücre "kalan" olacak şekilde 100'e kapanır. */
export function toPct(arr: number[]): number[] {
  const s = arr.reduce((a, b) => a + b, 0);
  const p = arr.map((v) => Math.round((v / s) * 1000) / 10);
  const head = p.slice(0, -1).reduce((a, b) => a + b, 0);
  p[p.length - 1] = Math.round((100 - head) * 10) / 10;
  return p;
}

export function shapesForProfile(key: ProfileKey): { wd: number[]; we: number[] } {
  return { wd: toPct(PROFILES[key].wd), we: toPct(PROFILES[key].we) };
}
export function monthlyForSeason(key: SeasonKey): number[] {
  return toPct(SEASON[key]);
}
