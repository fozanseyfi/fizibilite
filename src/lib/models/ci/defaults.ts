import type { CiInputs } from './engine';
import { shapesForProfile, monthlyForSeason, WE_RATIO } from './presets';

/** HTML kokpitinin varsayılan girdileri (1.000 kWp C&I örneği). */
export function defaultCiInputs(): CiInputs {
  const shapes = shapesForProfile('tekvardiya');
  return {
    pname: 'C&I Çatı GES — Saatlik Mahsuplaşma',
    prep: '',
    abone: 'ci',
    consY: 1200000,
    consPrev: 1200000,
    monthly: monthlyForSeason('yaz'),
    wd: shapes.wd,
    we: shapes.we,
    weRatio: WE_RATIO['tekvardiya'],
    profileId: 'tekvardiya',
    season: 'yaz',
    kwp: 1000,
    spec: 1550,
    orient: 's',
    degr: 0.5,
    life: 25,
    skb: 0,
    pBuy: 4.28,
    pSell: 3.95,
    esc1: 25,
    esc2: 12,
    preal: 0,
    fx0: 47,
    piUS: 2.5,
    fxMode: 'ppp',
    fxMan: 15,
    bessOn: false,
    bKwh: 1000,
    bKw: 500,
    bRte: 88,
    bDegr: 2,
    bCapex: 250,
    bOpex: 180,
    capexU: 600,
    opexU: 350,
    r: 10,
    lOn: false,
    lRatio: 70,
    lRate: 8,
    lTerm: 5,
  };
}
