import { describe, it, expect } from 'vitest';
import { computeUtility, computeUtilityHuawei } from '@/lib/models/utility/engine';
import { defaultUtilityInputs } from '@/lib/models/utility/defaults';

// Referans değerler: "GES + BESS Proje Finansmanı" HTML modelinin 100 MWp baz senaryosu.
describe('Utility engine — HTML baz senaryosuyla birebir', () => {
  const inputs = defaultUtilityInputs();
  const m = computeUtility(inputs);

  it('enerji: 1. yıl üretim ~164.657 MWh', () => {
    expect(m.E1).toBeCloseTo(164657, -2); // ±100 MWh
  });

  it('kaynak-kullanım: totalUses ~51,38 M$, debt ~35,97 M$, equity ~15,41 M$', () => {
    expect(m.totalUses / 1e6).toBeCloseTo(51.38, 1);
    expect(m.debt / 1e6).toBeCloseTo(35.97, 1);
    expect(m.equity / 1e6).toBeCloseTo(15.41, 1);
  });

  it('IDC ~991.180 $, fee ~539.483 $, DSRA ~1.348.709 $', () => {
    expect(m.idc).toBeCloseTo(991180, -4);
    expect(m.fee).toBeCloseTo(539483, -4);
    expect(m.dsra).toBeCloseTo(1348709, -4);
  });

  it('KPI: NPV ~29,28 M$, IRR %16,1, LCOE 36,7', () => {
    expect(m.npv / 1e6).toBeCloseTo(29.28, 1);
    expect(m.irr * 100).toBeCloseTo(16.08, 0);
    expect(m.lcoe).toBeCloseTo(36.7, 0);
  });

  it('borç oranları: minDSCR 1,30, avgDSCR ~1,43, LLCR 1,92, PLCR 2,77', () => {
    expect(m.minDSCR).toBeCloseTo(1.3, 1);
    expect(m.avgDSCR).toBeCloseTo(1.43, 1);
    expect(m.llcr).toBeCloseTo(1.92, 1);
    expect(m.plcr).toBeCloseTo(2.77, 1);
  });

  it('özkaynak: eIRR ~%23,4, MOIC ~13,94x, payback ~6,29 yıl', () => {
    expect(m.eIRR * 100).toBeCloseTo(23.4, 0);
    expect(m.moic).toBeCloseTo(13.94, 0);
    expect(m.pbS).toBeCloseTo(6.29, 0);
  });
});

describe('Utility engine — Huawei artımlı analiz', () => {
  const inputs = defaultUtilityInputs();
  const base = computeUtility(inputs);
  const hw = computeUtilityHuawei(inputs, base);

  it('ΔCAPEX 210.000 $, 1. yıl ek EBITDA ~223.167 $', () => {
    expect(hw.dCapex).toBe(210000);
    expect(hw.annual1).toBeCloseTo(223167, -3);
  });

  it('ΔNPV ~1.775.638 $, artımlı IRR ~%84,4', () => {
    expect(hw.dNPV).toBeCloseTo(1775638, -4);
    expect(hw.dIRR * 100).toBeCloseTo(84.4, 0);
  });

  it('Huawei LCOE 36,7 → 35,7, LLCR 1,92 → 1,95', () => {
    expect(hw.hwModel.lcoe).toBeCloseTo(35.7, 0);
    expect(hw.hwModel.llcr).toBeCloseTo(1.95, 1);
  });
});
