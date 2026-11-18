import type { Metadata } from "next";
import { TourView } from "@/components/tanitim/tour-view";

export const metadata: Metadata = {
  title: "Platform Tanıtımı — Fizibilite Platformu",
};

/** Sol menüdeki “Platform Tanıtımı” — uygulama kabuğu içinde (üst bar 56px + sayfa boşluğu 32px). */
export default function PlatformTanitimiPage() {
  return <TourView top={56 + 32} />;
}
