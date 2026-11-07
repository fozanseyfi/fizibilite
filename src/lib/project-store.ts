/**
 * GEÇİCİ proje deposu (localStorage, kullanıcıya özel).
 *
 * Önceden projeler sunucuda JSON dosyasında tutuluyordu; Vercel'de dosya
 * sistemi salt okunur olduğundan veriler sunucu kopyasının belleğinde kalıyor,
 * kaydettikten sonra açılan sayfa başka kopyaya düşünce proje "bulunamıyordu".
 * Supabase'e geçişte bu modül veritabanı çağrılarıyla değişecek.
 */

"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProjectSummary } from "@/lib/models/types";
import { useSession } from "@/lib/auth-store";

export type ProjectKind = "utility" | "ci" | "bess-ci" | "bess-utility";

export interface StoredProject {
  id: string;
  ownerId: string;
  name: string;
  kind: ProjectKind;
  /** Model girdileri (CiInputs | UtilityInputs) */
  inputs: Record<string, unknown>;
  summary: ProjectSummary;
  createdAt: string;
  updatedAt: string;
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

interface ProjectState {
  projects: StoredProject[];
  save: (input: {
    id?: string;
    ownerId: string;
    name: string;
    kind: ProjectKind;
    inputs: Record<string, unknown>;
    summary: ProjectSummary;
  }) => SaveResult;
  remove: (id: string) => void;
}

/** Ad karşılaştırması: büyük/küçük harf ve fazla boşluk farkı yok sayılır. */
export const normalizeName = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");

const newId = () => `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],

      save: ({ id, ownerId, name, kind, inputs, summary }) => {
        const clean = name.trim().replace(/\s+/g, " ");
        if (!clean) return { ok: false, error: "Proje adı boş olamaz." };
        const dup = get().projects.find(
          (p) => p.ownerId === ownerId && p.id !== id && normalizeName(p.name) === normalizeName(clean)
        );
        if (dup) {
          return {
            ok: false,
            error: `“${dup.name}” adında bir projeniz zaten var. Lütfen proje adını değiştirin.`,
          };
        }

        const now = new Date().toISOString();
        const existing = id ? get().projects.find((p) => p.id === id && p.ownerId === ownerId) : undefined;
        const row: StoredProject = {
          id: existing?.id ?? newId(),
          ownerId,
          name: clean,
          kind,
          inputs,
          summary,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        set((s) => ({
          projects: existing ? s.projects.map((p) => (p.id === row.id ? row : p)) : [...s.projects, row],
        }));
        return { ok: true, id: row.id };
      },

      remove: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
    }),
    { name: "fiz-project-store", version: 1 }
  )
);

/** localStorage'dan yükleme bitti mi? (ilk render'da "bulunamadı" göstermemek için) */
export function useProjectsHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useProjectStore.persist.hasHydrated()) setHydrated(true);
    return useProjectStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}

/** Oturumdaki kullanıcının projeleri, en son güncellenen önce. */
export function useMyProjects() {
  const session = useSession();
  const projects = useProjectStore((s) => s.projects);
  if (!session) return [];
  return projects
    .filter((p) => p.ownerId === session.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
