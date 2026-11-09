/**
 * Paylaşım linki — proje verisi linkin içinde taşınır.
 *
 * Projeler şimdilik yalnızca kullanıcının tarayıcısında (localStorage) duruyor;
 * linki başka cihazda açan kişi o veriye ulaşamaz. Bu yüzden link, oluşturulduğu
 * andaki proje girdilerini sıkıştırılmış olarak `#` sonrasında taşır (bu kısım
 * sunucuya hiç gönderilmez). Açan sayfa raporu bu girdilerden yeniden hesaplar.
 *
 * Supabase'e geçince link yalnızca bir kimlik taşıyacak; iptal de gerçek olacak.
 */

import type { ProjectKind, StoredProject } from "@/lib/project-store";

export interface SharePayload {
  v: 1;
  /** Proje adı */
  n: string;
  k: ProjectKind;
  /** Model girdileri */
  i: Record<string, unknown>;
  /** Paylaşan kişinin adı */
  by?: string;
  /** Oluşturma (ISO) */
  c: string;
  /** Son geçerlilik (ISO tarih) — yoksa süresiz */
  e?: string;
}

const KINDS: ProjectKind[] = ["utility", "ci", "bess-ci", "bess-utility"];

function toB64Url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const res = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

export async function encodeShare(p: SharePayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(p));
  return toB64Url(await pipe(json, new CompressionStream("deflate-raw")));
}

export async function decodeShare(code: string): Promise<SharePayload | null> {
  try {
    const raw = await pipe(fromB64Url(code.trim()), new DecompressionStream("deflate-raw"));
    const p = JSON.parse(new TextDecoder().decode(raw)) as SharePayload;
    if (p?.v !== 1 || typeof p.n !== "string" || !KINDS.includes(p.k) || !p.i || typeof p.i !== "object") return null;
    return p;
  } catch {
    return null;
  }
}

export function shareUrl(code: string): string {
  return `${window.location.origin}/p#${code}`;
}

export function isExpired(p: Pick<SharePayload, "e">, now = new Date()): boolean {
  if (!p.e) return false;
  // Son geçerlilik günü dahil
  return now.toISOString().slice(0, 10) > p.e;
}

/** Rapor üreticisi StoredProject bekliyor — linkteki veriden geçici bir kayıt kur. */
export function payloadToProject(p: SharePayload): StoredProject {
  return {
    id: "shared",
    ownerId: "shared",
    name: p.n,
    kind: p.k,
    inputs: p.i,
    summary: {} as StoredProject["summary"],
    createdAt: p.c,
    updatedAt: p.c,
  };
}
