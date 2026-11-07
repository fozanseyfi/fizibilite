/**
 * Admin sayfaları + arayüz durumu için localStorage-backed store.
 * Kullanıcı / oturum bilgisi burada DEĞİL — bkz. auth-store.ts.
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ShareLink {
  token: string;
  createdAt: string;
  expiresAt: string;
}

interface AdminState {
  shareLink: ShareLink | null;
  // ---------- UI state ----------
  /** Masaüstü sidebar daraltma durumu (true = ikon rail) */
  sidebarCollapsed: boolean;
  /** Proje detay sub-sidebar'ında her grup için açık/kapalı durum */
  projectGroupOpen: Record<string, boolean>;
  /** Mobil drawer açık mı? (persist edilmez) */
  mobileDrawerOpen: boolean;

  setShareLink: (link: ShareLink | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleProjectGroup: (groupId: string) => void;
  setProjectGroupOpen: (groupId: string, open: boolean) => void;
  openMobileDrawer: () => void;
  closeMobileDrawer: () => void;
}

export const useStore = create<AdminState>()(
  persist(
    (set) => ({
      shareLink: null,
      sidebarCollapsed: false,
      projectGroupOpen: { analytics: true, financial: true, risk: true, reports: true },
      mobileDrawerOpen: false,

      setShareLink: (link) => set({ shareLink: link }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleProjectGroup: (groupId) =>
        set((s) => ({
          projectGroupOpen: { ...s.projectGroupOpen, [groupId]: !s.projectGroupOpen[groupId] },
        })),
      setProjectGroupOpen: (groupId, open) =>
        set((s) => ({
          projectGroupOpen: { ...s.projectGroupOpen, [groupId]: open },
        })),
      openMobileDrawer: () => set({ mobileDrawerOpen: true }),
      closeMobileDrawer: () => set({ mobileDrawerOpen: false }),
    }),
    {
      name: "ges-admin-store",
      // Yalnızca kalıcı olması gerekenler (eski sürümlerden kalan kullanıcı alanları atılır)
      partialize: (s) => ({
        shareLink: s.shareLink,
        sidebarCollapsed: s.sidebarCollapsed,
        projectGroupOpen: s.projectGroupOpen,
      }),
    }
  )
);
