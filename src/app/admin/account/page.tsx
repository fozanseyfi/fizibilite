"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, KeyRound, Mail, Save, Shield, Trash2, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { FieldGroup, FormMessage, formatDateTr } from "@/components/shared/section-card";
import { ROLE_LABELS, initials, useAuthStore, useSession } from "@/lib/auth-store";

type Msg = { tone: "error" | "success"; text: string } | null;

const ROLE_PILL: Record<string, string> = {
  admin: "bg-blue/10 text-blue2 dark:text-blue",
  user: "bg-eco/10 text-eco-dark dark:text-eco-light",
  viewer: "bg-secondary text-muted-foreground",
};

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
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {/* Kimlik şeridi */}
      <section className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border bg-gradient-to-b from-card to-secondary/30 px-6 py-5">
        <div className="flex min-w-0 basis-full items-center gap-4 sm:basis-0 sm:flex-1">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-sidebar text-lg font-bold text-white" data-no-i18n>
            {initials(session.fullName)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Hesabım</p>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight">
              <span className="truncate" data-no-i18n>{session.fullName}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_PILL[session.role]}`}>
                <Shield className="size-3" /> {roleLabel}
              </span>
            </h1>
            <p className="truncate text-[13px] text-muted-foreground">{session.email}</p>
          </div>
        </div>
        <dl className="flex gap-6 text-xs">
          <div>
            <dt className="text-muted-foreground">Üyelik</dt>
            <dd className="font-semibold">{formatDateTr(session.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Son giriş</dt>
            <dd className="font-semibold">{session.lastLoginAt ? formatDateTr(session.lastLoginAt) : "—"}</dd>
          </div>
        </dl>
        {isAdmin && (
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 rounded-md border bg-card px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-secondary"
          >
            <Users className="size-4" /> Ekibi yönet <ArrowRight className="size-3.5" />
          </Link>
        )}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* Profil */}
        <Panel icon={User} title="Profil" desc="Ekip arkadaşlarınız sizi bu isimle görür.">
          <form onSubmit={onProfile} className="space-y-3.5">
            <FieldGroup label="Ad Soyad">
              <Input name="fullName" defaultValue={session.fullName} required />
            </FieldGroup>
            <FieldGroup label="E-posta">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={session.email} readOnly className="bg-secondary/50 pl-9 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Değiştirmek için{" "}
                <Link href="/admin/contact" className="font-semibold text-foreground underline-offset-2 hover:underline">
                  bize yazın
                </Link>
                .
              </p>
            </FieldGroup>
            {profileMsg && <FormMessage tone={profileMsg.tone}>{profileMsg.text}</FormMessage>}
            <div className="flex justify-end">
              <Button type="submit" size="sm" className="gap-1.5">
                <Save className="size-3.5" /> Kaydet
              </Button>
            </div>
          </form>
        </Panel>

        {/* Şifre */}
        <Panel icon={KeyRound} title="Şifre" desc="Mevcut şifrenizle onaylayıp yenisini belirleyin.">
          <form onSubmit={onPassword} className="space-y-3.5">
            <FieldGroup label="Mevcut şifre">
              <PasswordInput name="currentPassword" autoComplete="current-password" placeholder="••••••••" required />
            </FieldGroup>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <FieldGroup label="Yeni şifre">
                <PasswordInput name="newPassword" autoComplete="new-password" placeholder="En az 8 karakter" required minLength={8} />
              </FieldGroup>
              <FieldGroup label="Yeni şifre (tekrar)">
                <PasswordInput name="confirmPassword" autoComplete="new-password" placeholder="Tekrar yazın" required minLength={8} />
              </FieldGroup>
            </div>
            {pwdMsg && <FormMessage tone={pwdMsg.tone}>{pwdMsg.text}</FormMessage>}
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={pwdPending} className="gap-1.5">
                <KeyRound className="size-3.5" />
                {pwdPending ? "Güncelleniyor…" : "Şifreyi güncelle"}
              </Button>
            </div>
          </form>
        </Panel>
      </div>

      {/* Veri ve hesap */}
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-3.5">
          <Shield className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Verileriniz ve hesabınız</h2>
          <span className="text-xs text-muted-foreground">· KVKK</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold">Verilerimi indir</p>
            <p className="text-xs text-muted-foreground">Profil ve üyelik bilgileriniz, JSON dosyası olarak.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onExport} className="gap-1.5">
            <Download className="size-3.5" /> İndir
          </Button>
        </div>

        <div className="border-t px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-destructive">Hesabımı sil</p>
              <p className="text-xs text-muted-foreground">
                Hesabınız ve bilgileriniz kalıcı olarak silinir. <strong className="text-foreground">Geri alınamaz.</strong>
              </p>
            </div>
            {!showDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDelete(true)}
                className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" /> Sil
              </Button>
            )}
          </div>
          {showDelete && (
            <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.04] p-3">
              <label className="min-w-[220px] flex-1 space-y-1.5">
                <span className="block text-xs">
                  Onaylamak için <strong className="font-mono">SİL</strong> yazın
                </span>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="SİL" className="h-9 font-mono font-semibold" autoFocus />
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDelete(false);
                  setConfirmText("");
                }}
              >
                Vazgeç
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={onDelete} disabled={confirmText !== "SİL"} className="gap-1.5">
                <Trash2 className="size-3.5" /> Kalıcı olarak sil
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-start gap-3 border-b px-5 py-3.5">
        <Icon className="mt-0.5 size-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
