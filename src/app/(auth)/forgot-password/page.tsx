"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthAlert, AuthChrome, AuthHeading } from "@/components/auth/auth-chrome";

/**
 * Yerel modda e-posta gönderilemez. Supabase geçişinde burası
 * `resetPasswordForEmail` çağrısına bağlanacak (teklif platformundaki gibi).
 */
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  return (
    <AuthChrome cta="register">
      <main className="mx-auto max-w-[1400px] px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pt-12">
        <div className="mx-auto w-full max-w-md animate-in-up">
          <AuthHeading title="Şifremi Unuttum" subtitle="E-posta adresinizi girin, şifre sıfırlama linki gönderelim." />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="mt-5 space-y-4 sm:mt-7"
          >
            {sent && (
              <AuthAlert tone="info">
                Platform şu an <strong>yerel modda</strong> çalıştığı için e-posta gönderilemiyor. Bu
                özellik bulut hesabına (Supabase) geçişle aktif olacak.
              </AuthAlert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" name="email" type="email" placeholder="ornek@firma.com" required autoComplete="email" />
            </div>
            <Button type="submit" className="h-10 w-full text-sm font-semibold">
              Sıfırlama Linki Gönder
            </Button>
          </form>

          <p className="mt-5 text-center text-sm">
            <Link href="/login" className="font-semibold text-solar-dark hover:underline dark:text-solar-light">
              ← Giriş sayfasına dön
            </Link>
          </p>
        </div>
      </main>
    </AuthChrome>
  );
}
