"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowRight, Calendar, Download, KeyRound, Lock, Mail, Save, Shield, Trash2,
  User, UserCircle2, UserPlus, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PasswordInput } from "@/components/auth/password-input";
import {
  FeatureChip, FieldGroup, FormMessage, IconBox, SectionCard, formatDateTr,
} from "@/components/shared/section-card";
import { ROLE_LABELS, initials, useAuthStore, useSession } from "@/lib/auth-store";

type Msg = { tone: "error" | "success"; text: string } | null;

export default function AccountPage() {
  const session = useSession();
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const changePassword = useAuthStore((s) => s.changePassword);
  const deleteMyAccount = useAuthStore((s) => s.deleteMyAccount);
  const router = useRouter();

  const [profileMsg, setProfileMsg] = useState<Msg>(null);
  const [pwdMsg, setPwdMsg] = useState<Msg>(null);
  const [pwdPending, setPwdPending] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (!session) return null;
  const roleLabel = ROLE_LABELS[session.role];
  const isAdmin = session.role === "admin";

  function onProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = updateProfile({ fullName: String(new FormData(e.currentTarget).get("fullName")) });
    setProfileMsg(r.ok ? { tone: "success", text: r.message ?? "Kaydedildi." } : { tone: "error", text: r.error });
  }

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const next = String(fd.get("newPassword"));
    if (next !== String(fd.get("confirmPassword"))) {
      setPwdMsg({ tone: "error", text: "Yeni şifreler eşleşmiyor." });
      return;
    }
    setPwdPending(true);
    const r = await changePassword({ current: String(fd.get("currentPassword")), next });
    setPwdPending(false);
    if (r.ok) form.reset();
    setPwdMsg(r.ok ? { tone: "success", text: r.message ?? "Güncellendi." } : { tone: "error", text: r.error });
  }

  function onExport() {
    const s = session!;
    const data = {
      profil: { adSoyad: s.fullName, eposta: s.email, rol: roleLabel, uyelik: s.createdAt, sonGiris: s.lastLoginAt },
      disaAktarim: new Date().toISOString(),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `verilerim-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onDelete() {
    if (confirmText !== "SİL") return;
    deleteMyAccount();
    router.replace("/login");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Kimlik kartı */}
      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-7">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-sidebar text-2xl font-bold tracking-tight text-white">
              {initials(session.fullName)}
            </div>
            <div className="min-w-0 space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                <UserCircle2 className="size-3" />
                Hesabım
              </span>
              <h1 className="truncate text-2xl font-bold tracking-tight">{session.fullName}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-0.5 font-semibold">
                  <Shield className="size-3 text-primary" />
                  {roleLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="size-3.5" />
                  {session.email}
                </span>
              </div>
            </div>
          </div>
          <div className="grid gap-px border-t bg-border sm:grid-cols-3">
            <MetaCell icon={Shield} label="Rol" value={roleLabel} />
            <MetaCell icon={Calendar} label="Üyelik Tarihi" value={formatDateTr(session.createdAt)} />
            <MetaCell
              icon={User}
              label="Son Giriş"
              value={session.lastLoginAt ? formatDateTr(session.lastLoginAt) : "—"}
            />
          </div>
        </CardContent>
      </Card>

      <SectionCard icon={User} title="Profil bilgileri" subtitle="Görünen adınız — ekip arkadaşlarınız sizi bu isimle görür.">
        <form onSubmit={onProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup label="Ad Soyad">
              <Input name="fullName" defaultValue={session.fullName} required />
            </FieldGroup>
            <FieldGroup label="E-posta">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={session.email} readOnly className="bg-secondary/50 pl-9 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                E-posta değişimi için{" "}
                <Link href="/admin/contact" className="font-semibold text-foreground underline-offset-2 hover:underline">
                  iletişime geçin
                </Link>
                .
              </p>
            </FieldGroup>
          </div>
          {profileMsg && <FormMessage tone={profileMsg.tone}>{profileMsg.text}</FormMessage>}
          <Button type="submit" size="sm" className="gap-1.5">
            <Save className="size-3.5" /> Kaydet
          </Button>
        </form>
      </SectionCard>

      <SectionCard
        icon={KeyRound}
        title="Şifre güvenliği"
        subtitle="Mevcut şifrenizi onaylayarak yeni bir şifre belirleyin."
      >
        <form onSubmit={onPassword} className="space-y-4">
          <FieldGroup label="Mevcut Şifre">
            <PasswordInput name="currentPassword" autoComplete="current-password" placeholder="••••••••" required />
          </FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup label="Yeni Şifre">
              <PasswordInput name="newPassword" autoComplete="new-password" placeholder="En az 8 karakter" required minLength={8} />
            </FieldGroup>
            <FieldGroup label="Yeni Şifre (Tekrar)">
              <PasswordInput name="confirmPassword" autoComplete="new-password" placeholder="En az 8 karakter" required minLength={8} />
            </FieldGroup>
          </div>
          {pwdMsg && <FormMessage tone={pwdMsg.tone}>{pwdMsg.text}</FormMessage>}
          <Button type="submit" size="sm" disabled={pwdPending} className="gap-1.5">
            <KeyRound className="size-3.5" />
            {pwdPending ? "Güncelleniyor…" : "Şifreyi Güncelle"}
          </Button>
        </form>
      </SectionCard>

      <SectionCard
        icon={Shield}
        title="Hesap & Gizlilik (KVKK)"
        subtitle="Verilerinizi JSON olarak indirebilir, hesabınızı kalıcı olarak silebilirsiniz. Hesap silme geri alınamaz."
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-secondary/30 p-4">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold">Verilerimi İndir</p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">Profil ve üyelik bilgilerinizden oluşan JSON dosyası.</p>
            </div>
            <Button type="button" variant="outline" onClick={onExport} className="gap-1.5">
              <Download className="size-4" /> JSON İndir
            </Button>
          </div>

          <div className="rounded-lg border border-destructive/30 bg-destructive/[0.04] p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">Hesabımı Sil</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  <strong className="text-foreground">{session.email}</strong> hesabı kalıcı olarak silinir. Bu işlem{" "}
                  <strong className="text-foreground">geri alınamaz</strong>.
                </p>
                {!showDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDelete(true)}
                    className="mt-3 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" /> Hesabımı Silmek İstiyorum
                  </Button>
                ) : (
                  <div className="mt-3 space-y-2">
                    <label className="block text-[11px] font-semibold">
                      Onaylamak için kutuya <strong className="font-mono">SİL</strong> yazın:
                    </label>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="SİL"
                      className="max-w-xs font-mono font-semibold"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowDelete(false);
                          setConfirmText("");
                        }}
                      >
                        Vazgeç
                      </Button>
                      <Button type="button" variant="destructive" onClick={onDelete} disabled={confirmText !== "SİL"} className="gap-1.5">
                        <Trash2 className="size-4" /> Hesabımı Kalıcı Olarak Sil
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {isAdmin && (
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="grid lg:grid-cols-[1fr_auto]">
              <div className="space-y-4 p-6">
                <div className="flex items-start gap-3">
                  <IconBox icon={Users} size="lg" />
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Yönetici Paneli</p>
                    <h3 className="text-lg font-semibold tracking-tight">Ekip ve Yetkilendirme</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      Kullanıcı davet et, rolleri yönet.
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <FeatureChip icon={UserPlus} title="Kullanıcı Davet Et" desc="E-posta ile davet" />
                  <FeatureChip icon={Shield} title="Rol Yönetimi" desc="Yönetici / Kullanıcı / Görüntüleyici" />
                  <FeatureChip icon={Lock} title="Erişim Kontrolü" desc="Rol bazlı yetki" />
                </div>
              </div>
              <div className="flex items-stretch border-t bg-secondary/30 p-6 lg:border-l lg:border-t-0">
                <Link
                  href="/admin/users"
                  className="group inline-flex w-full items-center justify-between gap-3 rounded-xl bg-sidebar px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-sidebar/90 lg:w-auto lg:flex-col lg:justify-center lg:gap-2 lg:px-7"
                >
                  <Users className="size-5 lg:size-6" />
                  <span className="flex flex-1 flex-col text-left lg:flex-none lg:items-center lg:text-center">
                    <span className="text-[15px] font-bold leading-tight">Ekibi Yönet</span>
                    <span className="text-[11px] font-medium opacity-80">Davet, rol, erişim</span>
                  </span>
                  <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1 lg:hidden" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetaCell({
  icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-card px-5 py-3.5">
      <IconBox icon={icon} />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
