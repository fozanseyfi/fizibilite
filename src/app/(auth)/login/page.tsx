"use client";

import { useState } from "react";
import { LoginKitPage } from "@/components/auth/login-kit";
import { LOGIN_PLATFORM } from "@/lib/login-platform";
import { useAuthStore } from "@/lib/auth-store";

/*
 * Giriş sayfası. Görünüm bütün platformlarda ortak (components/auth/login-kit.tsx);
 * bu platforma özgü tanıtım ve ekranlar lib/login-platform.tsx'te.
 */
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

  return <LoginKitPage platform={LOGIN_PLATFORM} form={{ onSubmit, pending, error }} />;
}
