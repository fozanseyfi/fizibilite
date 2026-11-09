import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare, isExpired, type SharePayload } from '@/lib/share-link';
import { defaultUtilityInputs } from '@/lib/models/utility/defaults';

describe('paylaşım linki', () => {
  const p: SharePayload = { v: 1, n: 'Konya GES — Ünite 2', k: 'utility', i: defaultUtilityInputs() as unknown as Record<string, unknown>, by: 'Ozan', c: '2026-11-08T10:00:00.000Z', e: '2026-12-08' };

  it('kodlanıp aynen geri çözülür ve karekoda sığacak kadar kısadır', async () => {
    const code = await encodeShare(p);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThan(1500);
    expect(await decodeShare(code)).toEqual(p);
  });

  it('bozuk veya eksik link null döner', async () => {
    const code = await encodeShare(p);
    expect(await decodeShare(code.slice(0, 40))).toBeNull();
    expect(await decodeShare('abc')).toBeNull();
    expect(await decodeShare(await encodeShare({ ...p, k: 'x' as never }))).toBeNull();
  });

  it('son geçerlilik günü dahil açılır', () => {
    expect(isExpired(p, new Date('2026-12-08T22:00:00Z'))).toBe(false);
    expect(isExpired(p, new Date('2026-12-09T08:00:00Z'))).toBe(true);
    expect(isExpired({ e: undefined })).toBe(false);
  });
});
