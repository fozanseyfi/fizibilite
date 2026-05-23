/**
 * MODÜL 1 — Interest During Construction (IDC)
 *
 * İnşaat dönemi faizi kapitalize edilir → CAPEX'e eklenir → amortisman base artar.
 * Bankaya sunulacak modelde zorunlu kalemdir.
 *
 * Her ay:
 *   1. Drawdown = aylık CAPEX × debtRatio (kredi)
 *   2. Aylık faiz = ortalama bakiye × (yıllık faiz / 12)
 *      ortalama bakiye = öncekiBakiye + drawdown/2  (ay içinde lineer çekim varsayımı)
 *   3. Faiz kapitalize → outstandingDebt += drawdown + faiz
 *   4. Commitment fee = (taahhüt − çekilen) × (commitment_rate / 12)
 *
 * Arrangement fee: tek seferlik, toplam taahhüt × arrangement_pct.
 */

import { IdcInput, IdcResult } from './types';

export function calculateIdc(input: IdcInput): IdcResult {
  const { monthlyCapexDrawdowns, debtRatio, annualInterestRate, commitmentFeeRate, arrangementFeePct } = input;

  if (debtRatio < 0 || debtRatio > 1) throw new Error('debtRatio 0..1 aralığında olmalı');
  if (monthlyCapexDrawdowns.length === 0) {
    return {
      totalIdc: 0,
      monthlyIdc: [],
      monthlyCommitmentFee: [],
      arrangementFee: 0,
      totalFinanceCost: 0,
      outstandingDebtAtCod: 0,
      monthlyOutstandingDebt: [],
      monthlyDrawdown: [],
      monthlyEquityDrawdown: [],
    };
  }

  const monthlyRate = annualInterestRate / 12;
  const monthlyCommitRate = commitmentFeeRate / 12;
  const equityRatio = 1 - debtRatio;

  const totalCapex = monthlyCapexDrawdowns.reduce((a, b) => a + b, 0);
  const totalFacility = totalCapex * debtRatio; // toplam kredi taahhüdü

  let outstanding = 0;
  const monthlyIdc: number[] = [];
  const monthlyCommitmentFee: number[] = [];
  const monthlyOutstandingDebt: number[] = [];
  const monthlyDrawdown: number[] = [];
  const monthlyEquityDrawdown: number[] = [];

  for (let i = 0; i < monthlyCapexDrawdowns.length; i++) {
    const capex = monthlyCapexDrawdowns[i];
    const drawdown = capex * debtRatio;
    const equityDraw = capex * equityRatio;

    // Ortalama bakiye (ay içinde lineer çekim varsayımı)
    const avgBalance = outstanding + drawdown / 2;
    const idcThisMonth = avgBalance * monthlyRate;

    // Commitment fee — kullanılmayan kredinin yüzdesi
    const undrawn = Math.max(0, totalFacility - outstanding - drawdown);
    const commitFee = undrawn * monthlyCommitRate;

    // Kapitalize et
    outstanding += drawdown + idcThisMonth;

    monthlyIdc.push(idcThisMonth);
    monthlyCommitmentFee.push(commitFee);
    monthlyOutstandingDebt.push(outstanding);
    monthlyDrawdown.push(drawdown);
    monthlyEquityDrawdown.push(equityDraw);
  }

  const totalIdc = monthlyIdc.reduce((a, b) => a + b, 0);
  const totalCommit = monthlyCommitmentFee.reduce((a, b) => a + b, 0);
  const arrangementFee = totalFacility * arrangementFeePct;

  return {
    totalIdc,
    monthlyIdc,
    monthlyCommitmentFee,
    arrangementFee,
    totalFinanceCost: totalIdc + totalCommit + arrangementFee,
    outstandingDebtAtCod: outstanding,
    monthlyOutstandingDebt,
    monthlyDrawdown,
    monthlyEquityDrawdown,
  };
}
