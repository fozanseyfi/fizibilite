"use client";

import { useMemo, useState } from "react";
import { Clock, Mail, Search, Shield, Trash2, UserPlus, Users, Eye, User as UserIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTr } from "@/components/shared/section-card";
import { useToast } from "@/components/admin/toast";
import { ROLE_LABELS, useAuthStore, useSession, type Role } from "@/lib/auth-store";

const ROLES = Object.entries(ROLE_LABELS) as [Role, string][];

/** Rol başına renk + ikon + kısa açıklama */
const ROLE_META: Record<Role, { icon: React.ComponentType<{ className?: string }>; badge: string; dot: string; desc: string }> = {
  admin: {
    icon: Shield,
    badge: "border-blue/25 bg-blue/10 text-blue2 dark:text-blue",
    dot: "bg-blue",
    desc: "Ekibi davet eder, rolleri yönetir",
  },
  user: {
    icon: UserIcon,
    badge: "border-eco/25 bg-eco/10 text-eco-dark dark:text-eco-light",
    dot: "bg-eco",
    desc: "Standart üye, projelerle çalışır",
  },
  viewer: {
    icon: Eye,
    badge: "border-border bg-secondary text-muted-foreground",
    dot: "bg-muted-foreground",
    desc: "Görüntüleme amaçlı üye",
  },
};

const selectCls =
  "block h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toLocaleUpperCase("tr-TR") || "?";
}

function RoleBadge({ role, suffix }: { role: Role; suffix?: string }) {
  const M = ROLE_META[role];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${M.badge}`}>
      <M.icon className="size-3" />
      {ROLE_LABELS[role]}
      {suffix}
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
  const [email, setEmail] = useState("");
  const [role, setNewRole] = useState<Role>("user");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Role | "all">("all");

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

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const r = invite({ email, role });
    if (!r.ok) return toast(r.error, "error");
    toast("Davet oluşturuldu. Kullanıcı bu e-postayla kayıt olduğunda rolü otomatik atanır.", "success", 5000);
    setEmail("");
  }

  const stats: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
    { label: "Toplam üye", value: accounts.length, icon: Users, tone: "text-foreground" },
    { label: "Yönetici", value: counts.admin, icon: Shield, tone: "text-blue2 dark:text-blue" },
    { label: "Kullanıcı", value: counts.user, icon: UserIcon, tone: "text-eco-dark dark:text-eco-light" },
    { label: "Görüntüleyici", value: counts.viewer, icon: Eye, tone: "text-muted-foreground" },
    { label: "Bekleyen davet", value: invites.length, icon: Clock, tone: "text-solar-dark dark:text-solar-light" },
  ];

  return (
    <div className="w-full space-y-5">
      {/* Başlık */}
      <div className="flex flex-col gap-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Yönetici Paneli</p>
        <h1 className="text-2xl font-bold tracking-tight">Ekip ve Yetkilendirme</h1>
        <p className="text-sm text-muted-foreground">
          Panelinizdeki kişiler ve rolleri. Davet ettiğiniz kişiler yalnızca bu panelde görünür.
        </p>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <s.icon className={`size-4 ${s.tone}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-xl font-bold leading-none tabular-nums ${s.tone}`}>{s.value}</p>
                <p className="mt-1 truncate text-[11.5px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Üye listesi */}
        <Card className="overflow-hidden shadow-none">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Panel Üyeleri</h2>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{list.length}</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex rounded-md border bg-secondary/40 p-0.5 text-xs">
                {([["all", "Tümü"], ...ROLES] as [Role | "all", string][]).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFilter(v)}
                    className={`flex-1 whitespace-nowrap rounded px-2.5 py-1 font-medium transition-colors ${
                      filter === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İsim veya e-posta ara" className="h-8 w-full pl-8 text-xs sm:w-56" />
              </div>
            </div>
          </div>

          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <Search className="size-6 text-muted-foreground/60" />
              <p className="text-sm font-medium">Eşleşen üye yok</p>
              <p className="text-xs text-muted-foreground">Aramayı veya rol filtresini değiştirin.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {list.map((u) => {
                const me = u.id === session.id;
                const M = ROLE_META[u.role];
                return (
                  <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-secondary/30">
                    <div className="relative shrink-0">
                      <div className="flex size-10 items-center justify-center rounded-full bg-sidebar text-sm font-semibold text-white" data-no-i18n>
                        {initials(u.fullName)}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${M.dot}`} />
                    </div>

                    <div className="min-w-0 flex-1 basis-48">
                      <p className="flex items-center gap-2 truncate text-sm font-semibold">
                        <span className="truncate" data-no-i18n>{u.fullName}</span>
                        {me && <span className="rounded bg-blue/10 px-1.5 py-px text-[10px] font-semibold uppercase text-blue2 dark:text-blue">Siz</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>

                    <div className="hidden w-32 shrink-0 text-xs md:block">
                      <p className="text-muted-foreground">Katıldı</p>
                      <p className="font-medium">{formatDateTr(u.createdAt)}</p>
                    </div>
                    <div className="hidden w-32 shrink-0 text-xs lg:block">
                      <p className="text-muted-foreground">Son giriş</p>
                      <p className="font-medium">{u.lastLoginAt ? formatDateTr(u.lastLoginAt) : "—"}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {me || !isAdmin ? (
                        <RoleBadge role={u.role} />
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => {
                            setRole(u.id, e.target.value as Role);
                            toast(`${u.fullName}: rol ${ROLE_LABELS[e.target.value as Role]} olarak güncellendi`, "success");
                          }}
                          className={`${selectCls} w-36`}
                          aria-label="Rol"
                        >
                          {ROLES.map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      )}
                      <div className="w-8">
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
                            title="Bu panelden çıkar"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Sağ sütun: davet + bekleyenler */}
        <div className="space-y-5">
          {isAdmin ? (
            <Card className="shadow-none">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <UserPlus className="size-4 text-blue2 dark:text-blue" />
                  <h2 className="text-sm font-semibold">Yeni Kişi Davet Et</h2>
                </div>
                <form onSubmit={handleInvite} className="space-y-3">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="kullanici@firma.com"
                      className="pl-9"
                      aria-label="E-posta"
                      required
                    />
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
                          onClick={() => setNewRole(v)}
                          className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                            on ? "border-blue bg-blue/[0.06]" : "hover:bg-secondary/50"
                          }`}
                        >
                          <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${on ? "border-blue" : "border-muted-foreground/40"}`}>
                            {on && <span className="size-2 rounded-full bg-blue" />}
                          </span>
                          <M.icon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{l}</span>
                            <span className="block text-[11px] text-muted-foreground">{M.desc}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <Button type="submit" className="w-full gap-1.5">
                    <UserPlus className="size-4" /> Davet Oluştur
                  </Button>
                </form>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Davet e-postası gönderimi bulut hesabına (Supabase) geçişle aktif olacak. Şimdilik davet edilen kişi aynı
                  e-postayla kayıt olduğunda rolü otomatik atanır.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-none">
              <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
                <Shield className="mt-0.5 size-4 shrink-0" />
                Kullanıcı davet etme ve rol değiştirme yalnızca yöneticilere açık.
              </CardContent>
            </Card>
          )}

          <Card className="shadow-none">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 border-b px-5 py-3">
                <Clock className="size-4 text-solar-dark dark:text-solar-light" />
                <h2 className="text-sm font-semibold">Bekleyen Davetler</h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{invites.length}</span>
              </div>
              {invites.length === 0 ? (
                <p className="px-5 py-6 text-center text-xs text-muted-foreground">Bekleyen davet yok.</p>
              ) : (
                <ul className="divide-y">
                  {invites.map((i) => (
                    <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{i.email}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <RoleBadge role={i.role} />
                          <span className="text-[11px] text-muted-foreground">Bitiş: {formatDateTr(i.expiresAt)}</span>
                        </div>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
