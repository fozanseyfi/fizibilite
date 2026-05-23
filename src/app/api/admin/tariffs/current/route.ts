import { NextResponse } from 'next/server';
import { getTariffsV2, listTariffsV2 } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Şu an yürürlükteki tüm tarifeleri listele.
 * ?activeOn=YYYY-MM-DD parametresi ile geçmiş tarihteki aktif tarifeleri sorgulayabilirsiniz.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const activeOn = url.searchParams.get('activeOn') ?? new Date().toISOString().slice(0, 10);
  const store = getTariffsV2();
  const entries = listTariffsV2({ activeOn });
  return NextResponse.json({
    asOf: activeOn,
    decision: store.entries[0]?.sourceDocRef ?? null,
    lastSyncedAt: store.lastSyncedAt,
    lastSyncSource: store.lastSyncSource,
    timeOfUse: store.timeOfUse,
    skt: store.skt,
    unlicensedFees: store.unlicensedFees,
    entries,
  });
}
