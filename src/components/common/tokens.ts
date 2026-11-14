/**
 * Ortak sayfa şablonları (İletişim, Diğer Platformlar) için bu platformun renk sınıfları.
 * components/common/ klasörü tüm platformlarda BİREBİR aynıdır; yalnızca bu dosya platforma özeldir.
 * — Fizibilite Platformu
 */
export const T = {
  fg: "text-text",
  sub: "text-text2",
  faint: "text-text3",
  soft: "bg-bg2",
  soft2: "bg-bg3",
  hoverSoft: "hover:bg-bg2",
  card: "bg-card",
  heroGrad: "from-bg2 via-card to-emerald-500/5",
  toCard: "to-card",
  border: "border-border",
  input: "border-input bg-background",
  btn: "bg-[#0B2350] text-white hover:bg-[#0B2350]/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90",
  btnOutline: "border border-border bg-background hover:bg-secondary/50",
  accentText: "text-emerald-600 dark:text-emerald-400",
  accentSoft: "border-emerald-500/30 bg-emerald-500/10",
  glow: "bg-emerald-500/10",
} as const;
