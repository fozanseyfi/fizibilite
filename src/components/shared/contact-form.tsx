"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquare, Bug, Lightbulb, HelpCircle, Send, Mail } from "lucide-react";

const TOPICS = [
  { value: "general", label: "Genel Geri Bildirim", icon: MessageSquare },
  { value: "bug", label: "Hata Bildirimi", icon: Bug },
  { value: "feature", label: "Özellik Önerisi", icon: Lightbulb },
  { value: "question", label: "Soru / Yardım", icon: HelpCircle },
] as const;

type Topic = (typeof TOPICS)[number]["value"];

const MIN_LENGTH = 10;
const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";

/** Mesaj formu — gönderince kullanıcının e-posta uygulaması hazır taslakla açılır. */
export function ContactForm({ recipientEmail }: { recipientEmail: string }) {
  const [topic, setTopic] = useState<Topic>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const valid = subject.trim().length > 0 && message.length >= MIN_LENGTH;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const topicLabel = TOPICS.find((t) => t.value === topic)?.label ?? "";
    const params = new URLSearchParams({
      subject: `[Fizibilite – ${topicLabel}] ${subject}`,
      body: message,
    });
    window.location.href = `mailto:${recipientEmail}?${params.toString()}`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label className={labelCls}>Konu Türü</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TOPICS.map((t) => {
            const selected = topic === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTopic(t.value)}
                aria-pressed={selected}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 rounded-md border px-2 py-3 text-xs font-medium transition-colors",
                  selected
                    ? "border-sidebar bg-sidebar text-white shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <t.icon className="size-4" />
                <span className="text-center leading-tight">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-subject" className={labelCls}>Konu</Label>
        <Input
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Kısa bir özet — örn: Excel çıktısında hücre biçimi"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-message" className={labelCls}>Mesaj</Label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hangi sayfada, hangi adımda yaşandı, ne bekleniyordu, ne oldu?"
          rows={5}
          minLength={MIN_LENGTH}
          required
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>En az {MIN_LENGTH} karakter</span>
          <span className={cn(message.length >= MIN_LENGTH && "text-eco-dark dark:text-eco-light")}>
            {message.length} karakter
          </span>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <a
          href={`mailto:${recipientEmail}`}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-card px-4 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <Mail className="size-4" />
          E-posta ile Gönder
        </a>
        <Button type="submit" disabled={!valid} className="gap-2">
          <Send className="size-4" />
          Gönder
        </Button>
      </div>
    </form>
  );
}
