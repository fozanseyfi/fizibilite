"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthAlert, AuthChrome, AuthHeading } from "@/components/auth/auth-chrome";
import { PasswordInput } from "@/components/auth/password-input";
import { PlatformNoteCard, PrivacyCard } from "@/components/auth/login-info";
import { LoginShowcase } from "@/components/auth/login-showcase";
import { useAuthStore } from "@/lib/auth-store";

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const res = await login({ email: String(fd.get("email")), password: String(fd.get("password")) });
    // Başarılıysa yönlendirmeyi AppShell yapar (?next= desteğiyle)
    if (!res.ok) {
      setError(res.error);
      setPending(false);
    }
  }

  return (
    <AuthChrome cta="register">
      {/* 2 kolon (lg+), tek kolon mobil/tablet */}
      <main className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 pb-8 pt-6 sm:gap-8 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(380px,5fr)_7fr] lg:gap-12 lg:px-10 lg:pt-12">
        {/* SOL — Form */}
        <section className="flex flex-col">
          <div className="mx-auto w-full max-w-md animate-in-up">
            <AuthHeading
              title="Hoş Geldiniz"
              subtitle="Hesabınıza giriş yapın ve fizibilite çalışmalarınıza kaldığınız yerden devam edin."
            />

            <form onSubmit={onSubmit} className="mt-5 space-y-3.5 sm:mt-7 sm:space-y-4">
              {error && <AuthAlert tone="error">{error}</AuthAlert>}
              <div className="space-y-1.5">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" name="email" type="email" placeholder="ornek@firma.com" required autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Şifre</Label>
                  <Link href="/forgot-password" className="text-xs font-medium text-solar-dark hover:underline dark:text-solar-light">
                    Şifremi unuttum
                  </Link>
                </div>
                <PasswordInput id="password" name="password" placeholder="••••••••" required autoComplete="current-password" />
              </div>
              <Button type="submit" className="h-10 w-full text-sm font-semibold" disabled={pending}>
                {pending ? "Yükleniyor..." : "Giriş Yap"}
              </Button>
            </form>

            <p className="mt-4 text-center text-[13px] text-muted-foreground sm:mt-5 sm:text-sm">
              Hesabın yok mu?{" "}
              <Link href="/register" className="font-semibold text-solar-dark hover:underline dark:text-solar-light">
                Hemen kayıt ol
              </Link>
            </p>

            <div className="mt-5 sm:mt-6">
              <PlatformNoteCard />
            </div>
          </div>
        </section>

        {/* SAĞ — Önizleme + Veri Gizliliği (lg+) */}
        <section className="hidden flex-col gap-4 lg:flex lg:self-start">
          <LoginShowcase />
          <PrivacyCard />
        </section>
      </main>
    </AuthChrome>
  );
}
