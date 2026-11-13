import { describe, it, expect } from 'vitest';
import { computeCi } from '@/lib/models/ci/engine';
import { defaultCiInputs } from '@/lib/models/ci/defaults';
import { netFlows, netChart, monthSum } from '@/components/models/native/ci-render';

/**
 * Mahsuplaşma sekmesindeki grafik / enerji akışı ile motorun (fatura analizi, sonuçlar) 1. yıl değerleri aynı olmalı.
 */
const cases = [
  ['varsayılan', {}],
  ['BESS açık', { bessOn: true }],
  ['hafta içi/sonu ayrımlı + BESS', { weSplit: true, bessOn: true }],
  ['gerçek takvim (2025)', { calYear: 2025, weSplit: true }],
] as const;

describe('Mahsuplaşma görünümü = motor (1. yıl)', () => {
  for (const [name, patch] of cases) {
    it(name, () => {
      const i = { ...defaultCiInputs(), ...patch };
      const s = computeCi(i).years[0].s;
      const f = netFlows(i, { mi: 'y', view: 'm', wd: true, we: true });
      expect(f.faz).toBeCloseTo(s.faz, 3);   // şebekeye satılan (fazla)
      expect(f.mah).toBeCloseTo(s.mah, 3);   // doğrudan mahsup
      expect(f.cek).toBeCloseTo(s.cek, 3);   // şebekeden çekiş
      expect(f.dch).toBeCloseTo(s.shift, 3); // BESS kaydırma
      expect(f.prod).toBeCloseTo(s.prod, 3);
      // Aylık toplamlar da birebir
      s.monthly.forEach((mo, mi) => {
        const t = monthSum(i, mi);
        expect(t.faz).toBeCloseTo(mo.faz, 3);
        expect(t.cons).toBeCloseTo(mo.cons, 3);
      });
      expect(netChart(i, { mi: 'y', view: 'm', wd: true, we: true }).svg.length).toBeGreaterThan(100);
    });
  }
});
