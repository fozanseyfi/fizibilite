/**
 * Admin sayfaları için basit localStorage-backed store.
 * Auth yok — tek kullanıcı (Ozan Seyfi) varsayımı.
 * Supabase entegrasyonu sonrası bu modül RPC + auth ile değişecek.
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isSuperAdmin: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface ShareLink {
  token: string;
  createdAt: string;
  expiresAt: string;
}

interface AdminState {
  currentUser: AdminUser | null;
  panelName: string;
  shareLink: ShareLink | null;
  // ---------- UI state ----------
  /** Masaüstü sidebar daraltma durumu (true = 60px ikon rail) */
  sidebarCollapsed: boolean;
  /** Sol sidebar'da "Şablonlar" alt menüsü açık mı? */
  templatesOpen: boolean;
  /** Proje detay sub-sidebar'ında her grup için açık/kapalı durum */
  projectGroupOpen: Record<string, boolean>;
  /** Mobil drawer açık mı? (persist edilmez) */
  mobileDrawerOpen: boolean;

  setPanelName: (name: string) => void;
  updateCurrentUser: (patch: Partial<AdminUser>) => void;
  setShareLink: (link: ShareLink | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleTemplates: () => void;
  toggleProjectGroup: (groupId: string) => void;
  setProjectGroupOpen: (groupId: string, open: boolean) => void;
  openMobileDrawer: () => void;
  closeMobileDrawer: () => void;
}

const DEFAULT_USER: AdminUser = {
  id: "u_local",
  fullName: "Ozan Seyfi",
  email: "ozan.seyfi@kontrolmatik.com",
  phone: "",
  isSuperAdmin: true,
  createdAt: "2026-05-23T00:00:00Z",
  lastLoginAt: new Date().toISOString(),
};

export const useStore = create<AdminState>()(
  persist(
    (set) => ({
      currentUser: DEFAULT_USER,
      panelName: "GES-Fizibilite Pro",
      shareLink: null,
      sidebarCollapsed: false,
      templatesOpen: false,
      projectGroupOpen: { analytics: true, financial: true, risk: true, reports: true },
      mobileDrawerOpen: false,

      setPanelName: (name) => set({ panelName: name }),
      updateCurrentUser: (patch) =>
        set((s) => ({ currentUser: s.currentUser ? { ...s.currentUser, ...patch } : null })),
      setShareLink: (link) => set({ shareLink: link }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleTemplates: () => set((s) => ({ templatesOpen: !s.templatesOpen })),
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
      // mobil drawer durumunu persist etme — refresh sonrası kapalı açılsın
      partialize: (s) => {
        const { mobileDrawerOpen: _omit, ...rest } = s;
        return rest;
      },
    }
  )
);

export const useCurrentUser = () => useStore((s) => s.currentUser);
export const usePanelName = () => {
  const panel = useStore((s) => s.panelName);
  const user = useStore((s) => s.currentUser);
  return panel || user?.fullName || "";
};
