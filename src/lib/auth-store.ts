/**
 * GEÇİCİ yerel kimlik doğrulama (localStorage).
 *
 * Kullanıcılar ve oturum bu tarayıcıda tutulur; sunucuya hiçbir şey gitmez.
 * Şifreler düz metin saklanmaz: rastgele salt + SHA-256 (Web Crypto).
 *
 * Supabase entegrasyonunda bu modül kaldırılacak; sayfalar yalnızca
 * `register` / `login` / `logout` / `useSession` arayüzünü kullandığı için
 * geçiş tek dosyalık bir değişiklik olacak.
 */

"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useStore as useAdminStore } from "@/lib/admin-store";

export interface LocalAccount {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  lastLoginAt?: string;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

interface AuthState {
  accounts: LocalAccount[];
  sessionUserId: string | null;
  register: (input: { fullName: string; email: string; password: string }) => Promise<AuthResult>;
  login: (input: { email: string; password: string }) => Promise<AuthResult>;
  logout: () => void;
}

const MIN_PASSWORD = 8;

const normalizeEmail = (e: string) => e.trim().toLowerCase();

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

/** Giriş yapan hesabı admin store'daki "currentUser" ile eşitle (Hesabım sayfası vb.). */
function syncAdminUser(acc: LocalAccount | null) {
  useAdminStore.setState({
    currentUser: acc
      ? {
          id: acc.id,
          fullName: acc.fullName,
          email: acc.email,
          isSuperAdmin: true,
          createdAt: acc.createdAt,
          lastLoginAt: acc.lastLoginAt,
        }
      : null,
  });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accounts: [],
      sessionUserId: null,

      register: async ({ fullName, email, password }) => {
        const name = fullName.trim();
        const mail = normalizeEmail(email);
        if (!name) return { ok: false, error: "Ad soyad gerekli." };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))
          return { ok: false, error: "Geçerli bir e-posta adresi girin." };
        if (password.length < MIN_PASSWORD)
          return { ok: false, error: `Şifre en az ${MIN_PASSWORD} karakter olmalı.` };
        if (get().accounts.some((a) => a.email === mail))
          return { ok: false, error: "Bu e-posta ile kayıtlı bir hesap zaten var." };

        const salt = randomHex(16);
        const now = new Date().toISOString();
        const acc: LocalAccount = {
          id: `u_${randomHex(8)}`,
          fullName: name,
          email: mail,
          salt,
          passwordHash: await hashPassword(password, salt),
          createdAt: now,
          lastLoginAt: now,
        };
        set((s) => ({ accounts: [...s.accounts, acc], sessionUserId: acc.id }));
        syncAdminUser(acc);
        return { ok: true };
      },

      login: async ({ email, password }) => {
        const mail = normalizeEmail(email);
        const acc = get().accounts.find((a) => a.email === mail);
        // Hangi alanın hatalı olduğunu söylemiyoruz (hesap varlığını sızdırmamak için).
        const fail: AuthResult = { ok: false, error: "E-posta veya şifre hatalı." };
        if (!acc) return fail;
        if ((await hashPassword(password, acc.salt)) !== acc.passwordHash) return fail;

        const updated = { ...acc, lastLoginAt: new Date().toISOString() };
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === acc.id ? updated : a)),
          sessionUserId: acc.id,
        }));
        syncAdminUser(updated);
        return { ok: true };
      },

      logout: () => {
        set({ sessionUserId: null });
        syncAdminUser(null);
      },
    }),
    { name: "fiz-auth-store", version: 1 }
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
