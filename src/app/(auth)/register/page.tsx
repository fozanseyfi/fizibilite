"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthAlert, AuthChrome, AuthHeading } from "@/components/auth/auth-chrome";
import { PasswordInput } from "@/components/auth/password-input";
import { PrivacyCard } from "@/components/auth/login-info";
import { LoginShowcase } from "@/components/auth/login-showcase";
import { useAuthStore } from "@/lib/auth-store";

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    if (password !== String(fd.get("password2"))) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setPending(true);
    setError(null);
    const res = await register({
      fullName: String(fd.get("name")),
      email: String(fd.get("email")),
      password,
    });
    // Başarılıysa oturum açılır, AppShell ana sayfaya yönlendirir
    if (!res.ok) {
      setError(res.error);
      setPending(false);
    }
  }

  return (
    <AuthChrome cta="login">
      <main className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 pb-8 pt-6 sm:gap-8 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(380px,5fr)_7fr] lg:gap-12 lg:px-10 lg:pt-12">
        <section className="flex flex-col">
          <div className="mx-auto w-full max-w-md animate-in-up">
            <AuthHeading
              title="Hesap Oluştur"
              subtitle="E-posta adresinizle kayıt olun ve ilk fizibilite modelinizi dakikalar içinde kurun."
            />

            <form onSubmit={onSubmit} className="mt-5 space-y-3.5 sm:mt-7 sm:space-y-4">
              {error && <AuthAlert tone="error">{error}</AuthAlert>}
              <div className="space-y-1.5">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input id="name" name="name" placeholder="Ahmet Yılmaz" required autoComplete="name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" name="email" type="email" placeholder="ahmet@firma.com" required autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Şifre</Label>
                <PasswordInput id="password" name="password" placeholder="En az 8 karakter" required minLength={8} autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password2">Şifre (tekrar)</Label>
                <PasswordInput id="password2" name="password2" placeholder="Şifrenizi tekrar girin" required minLength={8} autoComplete="new-password" />
              </div>
              <Button type="submit" className="h-10 w-full text-sm font-semibold" disabled={pending}>
                {pending ? "Kayıt yapılıyor..." : "Kayıt Ol"}
              </Button>
            </form>

            <p className="mt-4 text-center text-[13px] text-muted-foreground sm:mt-5 sm:text-sm">
              Zaten hesabınız var mı?{" "}
              <Link href="/login" className="font-semibold text-solar-dark hover:underline dark:text-solar-light">
                Giriş yap
              </Link>
            </p>

            <div className="mt-5 sm:mt-6">
              <AuthAlert tone="info">
                Şu an <strong>yerel mod</strong>: hesabınız bu tarayıcıda saklanır. Bulut hesabına
                (Supabase) geçişte yeniden kayıt gerekebilir.
              </AuthAlert>
            </div>
          </div>
        </section>

        <section className="hidden flex-col gap-4 lg:flex lg:self-start">
          <LoginShowcase />
          <PrivacyCard />
        </section>
      </main>
    </AuthChrome>
  );
}
