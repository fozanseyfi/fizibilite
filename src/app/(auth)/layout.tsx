import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fizibilite Platformu — Giriş",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
