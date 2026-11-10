"use client";

import { useState } from "react";
import { Clock, Lock, Mail, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureChip, IconBox, formatDateTr } from "@/components/shared/section-card";
import { useToast } from "@/components/admin/toast";
import { ROLE_LABELS, useAuthStore, useSession, type Role } from "@/lib/auth-store";

const ROLES = Object.entries(ROLE_LABELS) as [Role, string][];

const selectCls =
  "block h-9 rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

  if (!session) return null;
  const isAdmin = session.role === "admin";

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const r = invite({ email, role });
    if (!r.ok) return toast(r.error, "error");
    toast("Davet oluşturuldu. Kullanıcı bu e-postayla kayıt olduğunda rolü otomatik atanır.", "success", 5000);
    setEmail("");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <IconBox icon={Users} size="lg" />
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                Yönetici Paneli
              </p>
              <h1 className="text-2xl font-bold tracking-tight">Ekip ve Yetkilendirme</h1>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Panelinizdeki kullanıcılar ve rolleri. Davet ettiğiniz kişiler yalnızca bu panelde görünür.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <FeatureChip icon={UserPlus} title="Kullanıcı Davet Et" desc="E-posta ile davet" />
            <FeatureChip icon={Shield} title="Rol Yönetimi" desc="Yönetici / Kullanıcı / Görüntüleyici" />
            <FeatureChip icon={Lock} title="Erişim Kontrolü" desc="Rol bazlı yetki" />
          </div>
        </CardContent>
      </Card>

      {!isAdmin && (
        <p className="rounded-md border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          Kullanıcı ekleme ve rol değiştirme yalnızca yöneticilere açık.
        </p>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4" /> Yeni Kullanıcı Davet Et
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kullanici@firma.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className={`${selectCls} h-10 w-full sm:w-44`}
                >
                  {ROLES.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="gap-1.5">
                <UserPlus className="size-4" /> Davet Oluştur
              </Button>
            </form>
            <p className="mt-3 text-[11.5px] text-muted-foreground">
              Davet e-postası gönderimi bulut hesabına (Supabase) geçişle aktif olacak. Şimdilik davet
              edilen kişi aynı e-postayla kayıt olduğunda rolü otomatik atanır.
            </p>
          </CardContent>
        </Card>
      )}

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4" /> Bekleyen Davetler ({invites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/60 text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">E-posta</th>
                    <th className="px-4 py-2.5 text-left font-medium">Rol</th>
                    <th className="px-4 py-2.5 text-left font-medium">Süre Bitiş</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invites.map((i) => (
                    <tr key={i.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="size-3.5 text-muted-foreground" />
                          {i.email}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">{ROLE_LABELS[i.role]}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTr(i.expiresAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => cancelInvite(i.id)}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                            title="Daveti iptal et"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" /> Panel Kullanıcıları ({accounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/60 text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">İsim</th>
                  <th className="px-4 py-2.5 text-left font-medium">E-posta</th>
                  <th className="px-4 py-2.5 text-left font-medium">Rol</th>
                  <th className="hidden px-4 py-2.5 text-left font-medium sm:table-cell">Katıldı</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {accounts.map((u) => {
                  const me = u.id === session.id;
                  return (
                    <tr key={u.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium" data-no-i18n>{u.fullName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        {me || !isAdmin ? (
                          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                            {ROLE_LABELS[u.role]}
                            {me && " (siz)"}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => {
                              setRole(u.id, e.target.value as Role);
                              toast("Rol güncellendi", "success");
                            }}
                            className={`${selectCls} h-8 w-full text-xs sm:w-40`}
                          >
                            {ROLES.map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">
                        {formatDateTr(u.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin && !me && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`${u.fullName} panelden çıkarılsın mı?`)) removeAccount(u.id);
                            }}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                            title="Bu panelden çıkar"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
