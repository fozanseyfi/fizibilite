import { NextRequest, NextResponse } from 'next/server';
import { upsertTariffV2, replaceTariffsV2, updateTimeOfUseV2, updateSktV2 } from '@/lib/db';
import type { TariffEntry, TimeOfUseDefinition, LastResortSupplyConfig } from '@/lib/tariffs/schema';

export const dynamic = 'force-dynamic';

/**
 * Otomatik scraping çalışmazsa manuel tarife ekleme/güncelleme.
 *
 * Body modları:
 *   - { mode: 'upsert', entry: TariffEntry }       → tek satır ekle/güncelle
 *   - { mode: 'replace', entries: TariffEntry[], syncSource: string } → toplu değiştir
 *   - { mode: 'tou', tou: TimeOfUseDefinition }    → ToU saat aralıkları
 *   - { mode: 'skt', skt: LastResortSupplyConfig } → SKTT konfigürasyonu
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    switch (body.mode) {
      case 'upsert': {
        upsertTariffV2(body.entry as TariffEntry);
        return NextResponse.json({ ok: true, mode: 'upsert', id: body.entry.id });
      }
      case 'replace': {
        const result = replaceTariffsV2(body.entries as TariffEntry[], { syncSource: body.syncSource });
        return NextResponse.json({ ok: true, mode: 'replace', ...result });
      }
      case 'tou': {
        updateTimeOfUseV2(body.tou as TimeOfUseDefinition);
        return NextResponse.json({ ok: true, mode: 'tou' });
      }
      case 'skt': {
        updateSktV2(body.skt as LastResortSupplyConfig);
        return NextResponse.json({ ok: true, mode: 'skt' });
      }
      default:
        return NextResponse.json({ error: 'Geçersiz mode' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'Manuel güncelleme hatası', detail: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}
