import type { Metadata } from "next";
import { ContactView } from "@/components/contact/contact-view";

export const metadata: Metadata = {
  title: "İletişime Geç — Fizibilite Platformu",
};

export default function ContactPage() {
  return <ContactView />;
}
