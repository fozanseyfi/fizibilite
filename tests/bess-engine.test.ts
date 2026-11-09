import { describe, expect, it } from 'vitest';
import { computeBessCi } from '@/lib/models/bess/ci';
import { computeBessUtility } from '@/lib/models/bess/utility';
import { bessUtilityFromSaved, defaultBessCiInputs, defaultBessUtilityInputs } from '@/lib/models/bess/defaults';

describe('C&I batarya', () => {
  it('kapasite 0 iken kazanç yok', () => {
    const m = computeBessCi({ ...defaultBessCiInputs(), bKwh: 0 });
    expect(m.y1.self).toBeCloseTo(0, 6);
    expect(m.y1Stats.disKwh).toBe(0);
  });

  it('akşam yüklü C&I tesiste güneş kaydırma faturayı düşürür', () => {
    const m = computeBessCi({ ...defaultBessCiInputs(), profileId: 'otel', pSell: 2.0 });
    expect(m.y1.self).toBeGreaterThan(0);
    expect(m.y1Stats.disKwh).toBeLessThanOrEqual((m.y1Stats.chSolar + m.y1Stats.chGrid) * 0.9 + 1e-6);
  });

  it('üç zamanlı tarifede gece→puant arbitrajı kazanç üretir; tek zamanlıda devre dışı', () => {
    const uc = computeBessCi({ ...defaultBessCiInputs(), useSelf: false, useArb: true, tariff: 'uc', pGece: 2, pPuant: 7 });
    expect(uc.y1.arb).toBeGreaterThan(0);
    expect(uc.y1Stats.chGrid).toBeGreaterThan(0);
    const tek = computeBessCi({ ...defaultBessCiInputs(), useSelf: false, useArb: true, tariff: 'tek' });
    expect(tek.y1.arb).toBe(0);
    expect(tek.warnings.join(' ')).toMatch(/üç zamanlı/);
  });

  it('meskende aylık mahsup: kaydırma kazanç getirmez (≤ 0)', () => {
    const m = computeBessCi({ ...defaultBessCiInputs(), abone: 'mesken', profileId: 'm_aksam', consY: 6000, kwp: 5, bKwh: 10, bKw: 5 });
    expect(m.y1.self).toBeLessThanOrEqual(1e-6);
  });

  it('zirve tıraşlama güç ve enerjiyle sınırlı', () => {
    const m = computeBessCi({ ...defaultBessCiInputs(), useSelf: false, usePeak: true, peakCutKw: 1000, bKw: 250, bKwh: 500, peakHours: 2, dod: 100 });
    expect(m.y1Stats.peakCutKw).toBeLessThanOrEqual(250);
    expect(m.y1.peak).toBeCloseTo(m.y1Stats.peakCutKw * 120 * 12, 6);
  });
});

describe('Utility batarya', () => {
  it('tüm süre YEKDEM iken arbitraj sıfır', () => {
    const m = computeBessUtility({ ...defaultBessUtilityInputs(), regime: 'yekdem', yekdemYears: 30, useClip: false, useArb: true });
    m.years.forEach((y) => expect(Math.abs(y.arbUsd)).toBeLessThan(1e-6));
  });

  it('Kırpma ve kısıntı yokken kurtarılacak enerji yok', () => {
    const m = computeBessUtility({ ...defaultBessUtilityInputs(), clipPct: 0, curtPct: 0, useArb: false });
    expect(m.y1Stats.recoveredMwh).toBeCloseTo(0, 6);
    expect(m.years[0].clipUsd).toBeCloseTo(0, 6);
  });

  it('kırpılan enerji kurtarılır ama kırpma + kısıntıyı aşamaz', () => {
    const m = computeBessUtility({ ...defaultBessUtilityInputs(), clipPct: 4, useArb: false });
    expect(m.y1Stats.recoveredMwh).toBeGreaterThan(0);
    expect(m.y1Stats.recoveredMwh).toBeLessThanOrEqual(m.y1Stats.clipMwh + m.y1Stats.curtMwh + 1e-6);
    expect(m.years[0].clipUsd).toBeGreaterThan(0);
  });

  it('serbest piyasada öğle→puant arbitrajı pozitif', () => {
    const m = computeBessUtility({ ...defaultBessUtilityInputs(), regime: 'merchant', useClip: false, useArb: true, ptfNoon: 1500, ptfPeak: 4000 });
    expect(m.years[0].arbUsd).toBeGreaterThan(0);
  });

  it('yan hizmete ayrılan MW arbitraj gücünden düşülür', () => {
    const m = computeBessUtility({ ...defaultBessUtilityInputs(), useAnc: true, ancMw: 2, bMw: 5 });
    expect(m.y1Stats.arbMw).toBe(3);
    expect(m.years[0].ancUsd).toBeGreaterThan(0);
  });
});

describe('örnek çıktılar (bilgi)', () => {
  it('varsayılanlar', () => {
    const c = computeBessCi(defaultBessCiInputs());
    const u = computeBessUtility(defaultBessUtilityInputs());
    console.log('C&I', JSON.stringify({ capex: c.capex, npv: Math.round(c.npv), irr: c.irr, pb: c.payback, y1: c.y1, st: c.y1Stats, lcos: c.lcos }));
    console.log('UTIL', JSON.stringify({ capex: u.capex, npv: Math.round(u.npv), irr: u.irr, pb: u.payback, y1: u.years[0], y7: u.years[6], st: u.y1Stats, lcos: u.lcos }));
  });
});

describe('Yan hizmet uyarısı', () => {
  it('gelirin çoğu yan hizmetten geliyorsa uyarır; fiyat TL enflasyonuyla otomatik artmaz', () => {
    const m = computeBessUtility({ ...defaultBessUtilityInputs(), useAnc: true, ancMw: 2, ancEsc: 0 });
    expect(m.warnings.join(' ')).toMatch(/yan hizmet varsayımına dayanıyor/);
    // TL'de sabit fiyat → USD geliri kur artışıyla düşer
    expect(m.years[1].ancUsd).toBeLessThan(m.years[0].ancUsd);
  });
});

import { sohCheck } from '@/lib/models/bess/common';
import { optimizeBessCi, optimizeBessUtility, sizeGrid } from '@/lib/models/bess/optimize';
import { bessCiFromSaved } from '@/lib/models/bess/defaults';

describe('Batarya sağlığı (SOH) şartı', () => {
  const reqs = [{ year: 5, pct: 90 }, { year: 10, pct: 80 }];
  it('%2,5 yıllık kayıp 5. yıl %90 şartını sağlamaz; izin verilen en fazla ≈%2,09', () => {
    const s = sohCheck(12, 0.025, 0, reqs);
    expect(s.ok).toBe(false);
    expect(s.rows[4].soh).toBeCloseTo(Math.pow(0.975, 5), 9);
    expect(s.maxDegr).toBeCloseTo(1 - Math.pow(0.9, 1 / 5), 9);
  });
  it('%2 kayıp iki kontrol noktasını da sağlar', () => {
    expect(sohCheck(12, 0.02, 0, reqs).ok).toBe(true);
  });
  it('hücre yenilemesi sağlığı yeniden %100\'e çeker', () => {
    const s = sohCheck(12, 0.03, 6, reqs);
    expect(s.rows[5].soh).toBeCloseTo(0.97, 9); // 6. yıl sonu: yenilemeden sonra 1 yıl
    expect(s.rows[9].ok).toBe(true); // 10. yıl: 5 yaş → 0,97^5 ≈ %85,9 ≥ %80
  });
});

describe('C-oranı ve iki parçalı maliyet', () => {
  it('güç = kapasite × C; maliyet enerji + güç', () => {
    const m = computeBessCi({ ...defaultBessCiInputs(), bKwh: 400, cRate: 0.25, capexKwh: 200, capexKw: 100 });
    expect(m.bKw).toBe(100);
    expect(m.capex).toBe(400 * 200 + 100 * 100);
    const u = computeBessUtility({ ...defaultBessUtilityInputs(), bMwh: 8, cRate: 1, capexKwh: 150, capexKw: 80 });
    expect(u.bMw).toBe(8);
    expect(u.capex).toBe(8000 * 150 + 8000 * 80);
  });
  it('özel (0) seçilince elle girilen güç kullanılır', () => {
    expect(computeBessCi({ ...defaultBessCiInputs(), cRate: 0, bKw: 123 }).bKw).toBe(123);
  });
  it('eski kayıtlar eski anlamıyla açılır (C-oranı ve güç maliyeti yok)', () => {
    const old = { ...defaultBessCiInputs(), bKw: 300, capexKwh: 300 } as Partial<ReturnType<typeof defaultBessCiInputs>>;
    delete old.cRate; delete old.capexKw;
    const i = bessCiFromSaved(old);
    expect(i.cRate).toBe(0);
    expect(i.capexKw).toBe(0);
    expect(computeBessCi(i).capex).toBe(500 * 300);
  });
});

describe('Optimizasyon', () => {
  it('ızgara yuvarlak değerler üretir', () => {
    expect(sizeGrid(100, 1000, 4)).toEqual([100, 400, 700, 1000]);
  });
  it('sonuçlar NPV\'ye göre azalan sırada ve tüm kombinasyonları içerir', () => {
    const rows = optimizeBessCi(defaultBessCiInputs(), [200, 500, 1000], [1, 0.5, 0.25]);
    expect(rows).toHaveLength(9);
    for (let k = 1; k < rows.length; k++) expect(rows[k - 1].npv).toBeGreaterThanOrEqual(rows[k].npv);
    const u = optimizeBessUtility(defaultBessUtilityInputs(), [5, 10], [0.5, 0.25]);
    expect(u).toHaveLength(4);
    console.log('OPT C&I en iyi 3:', JSON.stringify(rows.slice(0, 3).map((r) => ({ cap: r.cap, c: r.c, npv: Math.round(r.npv) }))));
    console.log('OPT UT  sıralı:', JSON.stringify(u.map((r) => ({ cap: r.cap, c: r.c, npv: Math.round(r.npv) }))));
  });
});

import { minOversize, sohStrategiesUtility } from '@/lib/models/bess/soh-strategy';
import { utUseCombos, ciUseCombos, yekdemSweep, dcSweep, arbSweep } from '@/lib/models/bess/usage';
import { clipFraction } from '@/lib/models/bess/utility';

describe('Sağlık şartı stratejileri', () => {
  const reqs = [{ year: 5, pct: 90 }, { year: 10, pct: 80 }];
  it('eklemesiz: iki şartı da sağlayan en küçük fazla', () => {
    const o = minOversize(0.025, 0, reqs, 12);
    expect(1.0 * (1 + o) * Math.pow(0.975, 5)).toBeGreaterThanOrEqual(0.9 - 1e-9);
    expect((1 + o) * Math.pow(0.975, 10)).toBeGreaterThanOrEqual(0.8 - 1e-9);
    expect(o).toBeLessThan(0.04);
  });
  it('5. yılda eklemede 10. yıl şartı yaş 6 ile kontrol edilir', () => {
    // 5. yıl kontrolü eklemeden sonra (yaş 1: %97,5), 10. yıl yaş 6: 0,975^6 ≈ %85,9 ≥ %80 → fazla gerekmez
    expect(minOversize(0.025, 5, reqs, 12)).toBe(0);
  });
  it('kapasite fazlası sağlığı ve yatırımı yükseltir; güç değişmez', () => {
    const base = { ...defaultBessUtilityInputs(), bDegr: 2.5, augYear: 0 };
    const a = computeBessUtility(base);
    const b = computeBessUtility({ ...base, oversize: 4 });
    expect(a.soh.ok).toBe(false);
    expect(b.soh.ok).toBe(true);
    expect(b.bMw).toBe(a.bMw);
    expect(b.capex - a.capex).toBeCloseTo(10000 * 0.04 * 220, 6);
  });
  it('kapasite ekleme yalnızca kaybolan kapasiteyi öder', () => {
    const m = computeBessUtility({ ...defaultBessUtilityInputs(), augYear: 10, bDegr: 2, augCost: 90 });
    const aug = m.years.find((y) => y.augUsd > 0)!;
    expect(aug.y).toBe(10);
    expect(aug.augUsd).toBeCloseTo(10000 * 90 * (1 - Math.pow(0.98, 9)), 6);
  });
  it('strateji listesi: her ekleme yılı + eklemesiz; hepsi şartı sağlar', () => {
    const rows = sohStrategiesUtility({ ...defaultBessUtilityInputs(), bDegr: 2.5 });
    expect(rows).toHaveLength(15);
    rows.forEach((r) => expect(r.sohOk).toBe(true));
  });
});

describe('Kullanım analizi', () => {
  it('Utility: 15 kombinasyon, marjinal katkı tümü − biri eksik', () => {
    const c = utUseCombos(defaultBessUtilityInputs());
    expect(c.rows).toHaveLength(15);
    const all = c.rows.find((r) => r.uses.length === 4)!;
    const noAnc = c.rows.find((r) => r.uses.length === 3 && !r.uses.includes('anc'))!;
    expect(c.marginal.find((m) => m.use === 'anc')!.npv).toBeCloseTo(all.npv - noAnc.npv, 6);
  });
  it('C&I: tek zamanlı tarifede arbitraj denenmez', () => {
    const c = ciUseCombos({ ...defaultBessCiInputs(), tariff: 'tek' });
    c.rows.forEach((r) => expect(r.uses).not.toContain('arb'));
  });
  it('YEKDEM taraması 0…ömür; ömür kadar YEKDEM\'de arbitraj geliri yok', () => {
    const i = defaultBessUtilityInputs();
    const rows = yekdemSweep(i, 0.11);
    expect(rows).toHaveLength(i.life + 1);
  });
  it('DC taraması: mevcut satırda fark 0; kırpma DC/AC ile artar', () => {
    const rows = dcSweep(defaultBessUtilityInputs(), 0.11, 300);
    expect(rows[0].deltaNoBess).toBeCloseTo(0, 6);
    expect(rows[0].deltaWithBess).toBeCloseTo(0, 6);
    for (let k = 1; k < rows.length; k++) expect(rows[k].clipPct).toBeGreaterThan(rows[k - 1].clipPct);
    expect(clipFraction(18, 10, 1650)).toBeGreaterThan(clipFraction(12, 10, 1650));
  });
  it('Arbitraj: fark büyüdükçe arbitraj geliri artar', () => {
    const rows = arbSweep({ ...defaultBessUtilityInputs(), regime: 'merchant' }, 0.11);
    for (let k = 1; k < rows.length; k++) expect(rows[k].arbNpvUsd).toBeGreaterThan(rows[k - 1].arbNpvUsd);
  });
});

describe('Utility tek kalem kurulum maliyeti', () => {
  it('ayrı $/kW ile kaydedilmiş proje açılınca yatırım değişmez', () => {
    const saved = { ...defaultBessUtilityInputs(), capexKwh: 170, capexKw: 100, cRate: 0.5 };
    const before = computeBessUtility(saved).capex;
    const loaded = bessUtilityFromSaved(saved);
    expect(loaded.capexKw).toBe(0);
    expect(loaded.capexKwh).toBeCloseTo(220, 6);
    expect(computeBessUtility(loaded).capex).toBeCloseTo(before, 3);
  });
});

describe('C&I sağlık şartı', () => {
  it('C&I / meskende kapasite şartı yok: yüksek kayıpta bile şart uyarısı çıkmaz', () => {
    const m = computeBessCi({ ...defaultBessCiInputs(), bDegr: 5 });
    expect(m.warnings.some((w) => /sağlığı şartı/.test(w))).toBe(false);
    expect('soh' in m).toBe(false);
  });
});

describe('C&I tek kalem kurulum maliyeti', () => {
  it('ayrı $/kW ile kaydedilmiş proje açılınca yatırım değişmez', () => {
    const saved = { ...defaultBessCiInputs(), capexKwh: 220, capexKw: 160, cRate: 0.5 };
    const before = computeBessCi(saved).capex;
    const loaded = bessCiFromSaved(saved);
    expect(loaded.capexKw).toBe(0);
    expect(loaded.capexKwh).toBeCloseTo(300, 6);
    expect(computeBessCi(loaded).capex).toBeCloseTo(before, 3);
  });
  it('optimizasyonda C-oranı fiyat farkı uygulanır', () => {
    const rows = optimizeBessCi(defaultBessCiInputs(), [500], [1, 0.5, 0.25], 120);
    const cap = (c: number) => rows.find((r) => r.c === c)!.capex;
    expect(cap(0.5)).toBeCloseTo(500 * 300, 6);
    expect(cap(1) - cap(0.5)).toBeCloseTo(500 * 60, 6);
    expect(cap(0.5) - cap(0.25)).toBeCloseTo(500 * 30, 6);
  });
});
