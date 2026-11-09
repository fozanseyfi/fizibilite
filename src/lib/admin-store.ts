/**
 * Admin sayfaları + arayüz durumu için localStorage-backed store.
 * Kullanıcı / oturum bilgisi burada DEĞİL — bkz. auth-store.ts.
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Oluşturulan paylaşım linki (link proje verisini içinde taşır — bkz. share-link.ts) */
export interface ShareLink {
  id: string;
  ownerId: string;
  projectId: string;
  projectName: string;
  url: string;
  createdAt: string;
  /** Son geçerlilik (ISO tarih); boşsa süresiz */
  expiresAt: string | null;
}

interface AdminState {
  shareLinks: ShareLink[];
  // ---------- UI state ----------
  /** Masaüstü sidebar daraltma durumu (true = ikon rail) */
  sidebarCollapsed: boolean;
  /** Proje detay sub-sidebar'ında her grup için açık/kapalı durum */
  projectGroupOpen: Record<string, boolean>;
  /** Mobil drawer açık mı? (persist edilmez) */
  mobileDrawerOpen: boolean;

  addShareLink: (link: ShareLink) => void;
  removeShareLink: (id: string) => void;
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
      shareLinks: [],
      sidebarCollapsed: false,
      projectGroupOpen: { analytics: true, financial: true, risk: true, reports: true },
      mobileDrawerOpen: false,

      addShareLink: (link) => set((s) => ({ shareLinks: [link, ...s.shareLinks] })),
      removeShareLink: (id) => set((s) => ({ shareLinks: s.shareLinks.filter((l) => l.id !== id) })),
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
      version: 2,
      // v1: tek "shareLink" vardı ve hiçbir sayfaya bağlı değildi — atılır
      migrate: (old) => {
        const o = (old ?? {}) as Partial<AdminState>;
        return { sidebarCollapsed: !!o.sidebarCollapsed, projectGroupOpen: o.projectGroupOpen ?? {}, shareLinks: [] } as unknown as AdminState;
      },
      // Yalnızca kalıcı olması gerekenler (eski sürümlerden kalan kullanıcı alanları atılır)
      partialize: (s) => ({
        shareLinks: s.shareLinks,
        sidebarCollapsed: s.sidebarCollapsed,
        projectGroupOpen: s.projectGroupOpen,
      }),
    }
  )
);
