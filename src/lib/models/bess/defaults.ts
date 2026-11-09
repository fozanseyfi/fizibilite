import type { BessCiInputs } from './ci';
import type { BessUtilityInputs } from './utility';

/**
 * Varsayılanlar ÖRNEKTİR. Tarife, güç bedeli, PTF ve yan hizmet fiyatları
 * kullanıcının kendi faturasından / EPİAŞ verisinden girilmelidir.
 * Kur ve TL fiyat artışı mevcut C&I modeliyle aynı başlangıç değerlerini kullanır.
 */
export function defaultBessCiInputs(): BessCiInputs {
  return {
    pname: 'Batarya Ekleme — C&I',
    prep: '', firm: '', loc: '',
    abone: 'ci',
    kwp: 500, spec: 1550, orient: 's', pvDegr: 0.5,
    consY: 1000000, profileId: 'otel', season: 'yaz',
    useSelf: true, useArb: false, usePeak: false, useBackup: false,
    tariff: 'tek',
    pTek: 4.28, pGunduz: 4.1, pPuant: 6.4, pGece: 2.6,
    pSell: 3.0,
    demandFee: 120, peakCutKw: 100, peakHours: 2,
    outageH: 10, outageCost: 20000, criticalKw: 100, eventH: 2, backupReserve: 20,
    bKwh: 500, bKw: 250, rte: 90, dod: 90, bDegr: 2, life: 12,
    cRate: 0.5, capexKwh: 220, capexKw: 160, opexPct: 1.5, augYear: 0, augCost: 120,
    fx0: 47, tlEsc: 25, fxEsc: 20, disc: 10,
  };
}

export function defaultBessUtilityInputs(): BessUtilityInputs {
  return {
    pname: 'Batarya Ekleme — Utility GES',
    prep: '', firm: '', loc: '',
    dcMwp: 12, acMw: 10, spec: 1650, pvDegr: 0.5, clipPct: 2, curtPct: 3,
    regime: 'yekdem', yekdemPrice: 51, yekdemYears: 6,
    ptfNoon: 2200, ptfDay: 3000, ptfPeak: 3900, ptfNight: 3300,
    useClip: true, useArb: true, useAnc: false, useImb: false,
    ancType: 'pfk', ancMw: 2, ancPrice: 1900, ancAvail: 90, ancHours: 0.5, ancEsc: 0,
    devPct: 8, imbCost: 300, imbReduce: 50,
    bMw: 5, bMwh: 10, rte: 88, dod: 90, bDegr: 2, life: 15,
    // Utility: tek kalem kurulum maliyeti ($/kWh, PCS + trafo + bağlantı dahil); capexKw kullanılmaz
    cRate: 0.5, capexKwh: 220, capexKw: 0, opexPct: 1.5, augYear: 10, augCost: 90,
    sohY1: 5, sohP1: 90, sohY2: 10, sohP2: 80, oversize: 0,
    fx0: 47, tlEsc: 25, fxEsc: 20, disc: 11,
  };
}

/**
 * Kayıtlı girdileri varsayılanlarla birleştirir. C-oranı ve güç maliyeti eklenmeden önce
 * kaydedilmiş projeler eski anlamlarıyla açılır: güç elle girilmiş (cRate 0), maliyetin
 * tamamı $/kWh (capexKw 0) — böylece eski projelerin sonuçları değişmez.
 */
export function bessCiFromSaved(saved?: Partial<BessCiInputs>): BessCiInputs {
  const d = defaultBessCiInputs();
  if (!saved) return d;
  return { ...d, ...saved, cRate: saved.cRate ?? 0, capexKw: saved.capexKw ?? 0 };
}

/**
 * Utility'de maliyet tek kalemdir ($/kWh). Ayrı güç maliyetiyle ($/kW) kaydedilmiş projelerde
 * o kalem kWh başına çevrilip enerji maliyetine eklenir — toplam yatırım değişmez.
 */
export function bessUtilityFromSaved(saved?: Partial<BessUtilityInputs>): BessUtilityInputs {
  const d = defaultBessUtilityInputs();
  if (!saved) return d;
  const x = { ...d, ...saved, cRate: saved.cRate ?? 0, capexKw: saved.capexKw ?? 0 };
  if (x.capexKw > 0) {
    const ratio = x.cRate > 0 ? x.cRate : x.bMwh > 0 ? x.bMw / x.bMwh : 0;
    x.capexKwh = Math.round((x.capexKwh + x.capexKw * ratio) * 100) / 100;
    x.capexKw = 0;
  }
  return x;
}
