"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Eye, Mail, Plus, Search, Shield, Trash2, User as UserIcon, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTr } from "@/components/shared/section-card";
import { useToast } from "@/components/admin/toast";
import { ROLE_LABELS, useAuthStore, useSession, type Role } from "@/lib/auth-store";

const ROLES = Object.entries(ROLE_LABELS) as [Role, string][];

/** Rol başına renk + ikon + kısa açıklama */
const ROLE_META: Record<Role, { icon: React.ComponentType<{ className?: string }>; pill: string; desc: string }> = {
  admin: { icon: Shield, pill: "bg-blue/10 text-blue2 dark:text-blue", desc: "Kişi davet eder, rolleri değiştirir" },
  user: { icon: UserIcon, pill: "bg-eco/10 text-eco-dark dark:text-eco-light", desc: "Projelerle çalışır" },
  viewer: { icon: Eye, pill: "bg-secondary text-muted-foreground", desc: "Görüntüleme amaçlı" },
};

const selectCls =
  "block h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toLocaleUpperCase("tr-TR") || "?";
}

function RolePill({ role, className = "" }: { role: Role; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${ROLE_META[role].pill} ${className}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {ROLE_LABELS[role]}
    </span>
  );
}

export default function UsersPage() {
  const session = useSession();
  const accounts = useAuthStore((s) => s.accounts);
  const invites = useAuthStore((s) => s.invites);
  const invite = useAuthStore((s) => s.invite);
  const cancelInvite = useAuthStore((s) => s.cancelInvite);
  const setRole = useAuthStore((s) => s.setRole);
  const removeAccount = useAuthStore((s) => s.removeAccount);
  const toast = useToast((s) => s.push);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Role | "all">("all");
  const [open, setOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<Role, number> = { admin: 0, user: 0, viewer: 0 };
    accounts.forEach((a) => c[a.role]++);
    return c;
  }, [accounts]);

  const list = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr-TR");
    return accounts
      .filter((a) => filter === "all" || a.role === filter)
      .filter((a) => !s || a.fullName.toLocaleLowerCase("tr-TR").includes(s) || a.email.toLowerCase().includes(s))
      .sort((a, b) => (a.id === session?.id ? -1 : b.id === session?.id ? 1 : a.fullName.localeCompare(b.fullName, "tr")));
  }, [accounts, q, filter, session?.id]);

  if (!session) return null;
  const isAdmin = session.role === "admin";

  const segs: [Role | "all", string, number][] = [["all", "Tümü", accounts.length], ...ROLES.map(([v, l]) => [v, l, counts[v]] as [Role, string, number])];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      {/* Başlık */}
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl border bg-gradient-to-b from-card to-secondary/30 px-6 py-6">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Yönetici paneli</p>
          <h1 className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight">Ekip ve yetkilendirme</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Panelinizde kimlerin olduğunu ve ne yapabildiklerini buradan yönetin.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="size-4" /> Kişi davet et
          </Button>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Üye listesi */}
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5">
            <div className="flex max-w-full overflow-x-auto rounded-lg bg-secondary p-[3px] text-[12.5px]" role="tablist">
              {segs.map(([v, l, n]) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={filter === v}
                  onClick={() => setFilter(v)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition-colors ${
                    filter === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l} <span className="tabular-nums opacity-70">{n}</span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İsim veya e-posta ara" className="h-9 pl-8 text-[13px]" />
            </div>
          </div>

          {list.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium">Eşleşen üye yok</p>
              <p className="mt-1 text-xs text-muted-foreground">Aramayı veya rol filtresini değiştirin.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {list.map((u) => {
                const me = u.id === session.id;
                return (
                  <li
                    key={u.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_32px] items-center gap-x-3.5 gap-y-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_110px_150px_32px]"
                  >
                    <div className="flex size-[38px] items-center justify-center rounded-full bg-sidebar text-[13px] font-bold text-white" data-no-i18n>
                      {initials(u.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <span className="truncate" data-no-i18n>{u.fullName}</span>
                        {me && (
                          <span className="rounded bg-blue/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-blue2 dark:text-blue">
                            Siz
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[12.5px] text-muted-foreground">{u.email}</p>
                    </div>
                    <p className="hidden text-xs text-muted-foreground sm:block" title="Katılma tarihi">
                      {formatDateTr(u.createdAt)}
                    </p>
                    <div className="col-span-3 col-start-2 row-start-2 sm:col-span-1 sm:col-start-auto sm:row-start-auto">
                      {me || !isAdmin ? (
                        <RolePill role={u.role} />
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => {
                            const r = e.target.value as Role;
                            setRole(u.id, r);
                            toast(`${u.fullName}: rol ${ROLE_LABELS[r]} olarak güncellendi`, "success");
                          }}
                          className={`${selectCls} max-w-[150px]`}
                          aria-label={`${u.fullName} rolü`}
                        >
                          {ROLES.map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto">
                      {isAdmin && !me && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`${u.fullName} panelden çıkarılsın mı?`)) {
                              removeAccount(u.id);
                              toast("Üye panelden çıkarıldı", "success");
                            }
                          }}
                          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          title="Panelden çıkar"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Yan sütun */}
        <aside className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-solar-dark dark:text-solar-light" />
              Bekleyen davetler <span className="tabular-nums text-muted-foreground">· {invites.length}</span>
            </h2>
            {invites.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">Bekleyen davet yok.</p>
            ) : (
              <ul className="mt-2">
                {invites.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 border-t border-dashed py-2.5 first:border-t-0">
                    <div className="min-w-0">
                      <p className="truncate text-[13px]">{i.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[i.role]} · {formatDateTr(i.expiresAt)} tarihine kadar
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => cancelInvite(i.id)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Daveti iptal et"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2.5 rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Roller</h2>
            {ROLES.map(([v]) => (
              <div key={v} className="flex items-start gap-2.5 text-[12.5px]">
                <RolePill role={v} className="min-w-[104px] justify-center" />
                <span className="pt-px text-muted-foreground">{ROLE_META[v].desc}</span>
              </div>
            ))}
          </section>

          {!isAdmin && (
            <p className="rounded-xl border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
              Kişi davet etme ve rol değiştirme yalnızca yöneticilere açık.
            </p>
          )}
        </aside>
      </div>

      {open && (
        <InviteDialog
          onClose={() => setOpen(false)}
          onSubmit={(email, role) => {
            const r = invite({ email, role });
            if (!r.ok) {
              toast(r.error, "error");
              return false;
            }
            toast("Davet oluşturuldu. Kişi bu e-postayla kayıt olduğunda rolü otomatik atanır.", "success", 5000);
            return true;
          }}
        />
      )}
    </div>
  );
}

function InviteDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (email: string, role: Role) => boolean }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("user");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="inv-title" className="w-full max-w-md rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 id="inv-title" className="flex items-center gap-2 text-base font-semibold">
            <UserPlus className="size-4 text-blue2 dark:text-blue" /> Kişi davet et
          </h2>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary" title="Kapat">
            <X className="size-4" />
          </button>
        </div>
        <form
          className="space-y-4 px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (onSubmit(email, role)) onClose();
          }}
        >
          <div className="relative">
            <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input ref={ref} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kullanici@firma.com" className="pl-9" aria-label="E-posta" required />
          </div>
          <div className="space-y-1.5" role="radiogroup" aria-label="Rol">
            {ROLES.map(([v, l]) => {
              const M = ROLE_META[v];
              const on = role === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setRole(v)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${on ? "border-blue bg-blue/[0.06]" : "hover:bg-secondary/50"}`}
                >
                  <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${on ? "border-blue" : "border-muted-foreground/40"}`}>
                    {on && <span className="size-2 rounded-full bg-blue" />}
                  </span>
                  <M.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{l}</span>
                    <span className="block text-[11.5px] text-muted-foreground">{M.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            Davet e-postası gönderimi bulut hesabına (Supabase) geçişle aktif olacak. Şimdilik davet edilen kişi aynı e-postayla kayıt olduğunda rolü otomatik atanır.
          </p>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Vazgeç</Button>
            <Button type="submit" className="gap-1.5"><UserPlus className="size-4" /> Davet oluştur</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
