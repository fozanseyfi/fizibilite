/**
 * GEÇİCİ yerel kimlik doğrulama (localStorage).
 *
 * Kullanıcılar, roller, davetler ve oturum bu tarayıcıda tutulur; sunucuya
 * hiçbir şey gitmez. Şifreler düz metin saklanmaz: rastgele salt + SHA-256.
 *
 * Supabase entegrasyonunda bu modül kaldırılacak; sayfalar yalnızca buradaki
 * aksiyonları ve `useSession` kancasını kullandığı için geçiş tek dosyada kalır.
 */

"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "admin" | "user" | "viewer";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Yönetici",
  user: "Kullanıcı",
  viewer: "Görüntüleyici",
};

export interface LocalAccount {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  passwordHash: string;
  salt: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface LocalInvite {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
}

export type AuthResult = { ok: true; message?: string } | { ok: false; error: string };

interface AuthState {
  accounts: LocalAccount[];
  invites: LocalInvite[];
  sessionUserId: string | null;

  register: (input: { fullName: string; email: string; password: string }) => Promise<AuthResult>;
  login: (input: { email: string; password: string }) => Promise<AuthResult>;
  logout: () => void;

  updateProfile: (input: { fullName: string }) => AuthResult;
  changePassword: (input: { current: string; next: string }) => Promise<AuthResult>;
  deleteMyAccount: () => void;

  invite: (input: { email: string; role: Role }) => AuthResult;
  cancelInvite: (id: string) => void;
  setRole: (userId: string, role: Role) => void;
  removeAccount: (userId: string) => void;
}

const MIN_PASSWORD = 8;
const INVITE_DAYS = 7;

const normalizeEmail = (e: string) => e.trim().toLowerCase();
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function randomHex(bytes: number) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accounts: [],
      invites: [],
      sessionUserId: null,

      register: async ({ fullName, email, password }) => {
        const name = fullName.trim();
        const mail = normalizeEmail(email);
        if (!name) return { ok: false, error: "Ad soyad gerekli." };
        if (!isEmail(mail)) return { ok: false, error: "Geçerli bir e-posta adresi girin." };
        if (password.length < MIN_PASSWORD)
          return { ok: false, error: `Şifre en az ${MIN_PASSWORD} karakter olmalı.` };
        if (get().accounts.some((a) => a.email === mail))
          return { ok: false, error: "Bu e-posta ile kayıtlı bir hesap zaten var." };

        // İlk hesap yönetici; davet edilmişse davetteki rol; değilse kullanıcı.
        const invite = get().invites.find((i) => i.email === mail);
        const role: Role = get().accounts.length === 0 ? "admin" : invite?.role ?? "user";

        const salt = randomHex(16);
        const now = new Date().toISOString();
        const acc: LocalAccount = {
          id: `u_${randomHex(8)}`,
          fullName: name,
          email: mail,
          role,
          salt,
          passwordHash: await hashPassword(password, salt),
          createdAt: now,
          lastLoginAt: now,
        };
        set((s) => ({
          accounts: [...s.accounts, acc],
          invites: s.invites.filter((i) => i.email !== mail),
          sessionUserId: acc.id,
        }));
        return { ok: true };
      },

      login: async ({ email, password }) => {
        const mail = normalizeEmail(email);
        const acc = get().accounts.find((a) => a.email === mail);
        // Hangi alanın hatalı olduğunu söylemiyoruz (hesap varlığını sızdırmamak için).
        const fail: AuthResult = { ok: false, error: "E-posta veya şifre hatalı." };
        if (!acc) return fail;
        if ((await hashPassword(password, acc.salt)) !== acc.passwordHash) return fail;

        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === acc.id ? { ...a, lastLoginAt: new Date().toISOString() } : a
          ),
          sessionUserId: acc.id,
        }));
        return { ok: true };
      },

      logout: () => set({ sessionUserId: null }),

      updateProfile: ({ fullName }) => {
        const name = fullName.trim();
        const id = get().sessionUserId;
        if (!id) return { ok: false, error: "Oturum bulunamadı." };
        if (!name) return { ok: false, error: "Ad soyad boş olamaz." };
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, fullName: name } : a)) }));
        return { ok: true, message: "Profil güncellendi." };
      },

      changePassword: async ({ current, next }) => {
        const acc = get().accounts.find((a) => a.id === get().sessionUserId);
        if (!acc) return { ok: false, error: "Oturum bulunamadı." };
        if ((await hashPassword(current, acc.salt)) !== acc.passwordHash)
          return { ok: false, error: "Mevcut şifre hatalı." };
        if (next.length < MIN_PASSWORD)
          return { ok: false, error: `Yeni şifre en az ${MIN_PASSWORD} karakter olmalı.` };
        const salt = randomHex(16);
        const passwordHash = await hashPassword(next, salt);
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === acc.id ? { ...a, salt, passwordHash } : a)),
        }));
        return { ok: true, message: "Şifre güncellendi." };
      },

      deleteMyAccount: () => {
        const id = get().sessionUserId;
        set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id), sessionUserId: null }));
      },

      invite: ({ email, role }) => {
        const mail = normalizeEmail(email);
        if (!isEmail(mail)) return { ok: false, error: "Geçerli bir e-posta adresi girin." };
        if (get().accounts.some((a) => a.email === mail))
          return { ok: false, error: "Bu e-posta zaten kayıtlı bir kullanıcıya ait." };
        if (get().invites.some((i) => i.email === mail))
          return { ok: false, error: "Bu e-postaya zaten bekleyen bir davet var." };
        const now = new Date();
        const inv: LocalInvite = {
          id: `inv_${randomHex(6)}`,
          email: mail,
          role,
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + INVITE_DAYS * 86_400_000).toISOString(),
        };
        set((s) => ({ invites: [inv, ...s.invites] }));
        return { ok: true, message: "Davet oluşturuldu." };
      },

      cancelInvite: (id) => set((s) => ({ invites: s.invites.filter((i) => i.id !== id) })),

      setRole: (userId, role) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === userId ? { ...a, role } : a)) })),

      removeAccount: (userId) =>
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== userId || a.id === s.sessionUserId),
        })),
    }),
    {
      name: "fiz-auth-store",
      version: 2,
      // v1 → v2: rol + davet alanları. İlk hesap yönetici olur.
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Partial<AuthState>;
        if (version < 2) {
          s.accounts = (s.accounts ?? []).map((a, i) => ({
            ...a,
            role: (a as LocalAccount).role ?? (i === 0 ? "admin" : "user"),
          }));
          s.invites = s.invites ?? [];
        }
        return s as AuthState;
      },
    }
  )
);

/**
 * localStorage'dan yükleme bitene kadar `false` döner. SSR ile ilk render
 * arasında yanlış yönlendirme olmasın diye guard'lar bunu bekler.
 */
export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}

export function useSession() {
  const sessionUserId = useAuthStore((s) => s.sessionUserId);
  const accounts = useAuthStore((s) => s.accounts);
  return sessionUserId ? accounts.find((a) => a.id === sessionUserId) ?? null : null;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("tr");
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase("tr");
}
