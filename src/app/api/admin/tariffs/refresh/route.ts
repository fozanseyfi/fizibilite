import { NextResponse } from 'next/server';
import { checkForNewEpdkDecision } from '@/lib/tariffs/scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * EPDK'dan en son tarife kararını kontrol et.
 * Yeni karar varsa admin'i bilgilendirir; otomatik DB güncellemesi yapmaz
 * (Excel parsing tam otomatize değil — manuel onay gerekir).
 *
 * Auth: V1'de açık (auth modülü yok). Production'da JWT/admin role kontrolü ekle.
 */
export async function POST() {
  const result = await checkForNewEpdkDecision();
  return NextResponse.json(result, {
    status: result.status === 'fetch_failed' ? 502 : 200,
  });
}
