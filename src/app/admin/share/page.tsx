"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Share2, Copy, Check, Plus, X, Mail, MessageSquare, QrCode, Download, Send, Trash2, ExternalLink, Loader2,
} from "lucide-react";
import { useStore, type ShareLink } from "@/lib/admin-store";
import { appLocale } from "@/lib/i18n";
import { useSession } from "@/lib/auth-store";
import { useMyProjects } from "@/lib/project-store";
import { encodeShare, shareUrl } from "@/lib/share-link";
import { KIND_SHORT } from "@/lib/models/types";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardTitle } from "@/components/admin/card";
import { Button } from "@/components/admin/button";
import { Input } from "@/components/admin/input";
import { Badge } from "@/components/admin/badge";
import { confirmAction } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import { formatDate, toISODate, addDays, cn } from "@/lib/utils";

const VALIDITY = [
  { days: 7, label: "7 gün" },
  { days: 30, label: "30 gün" },
  { days: 90, label: "90 gün" },
  { days: 0, label: "Süresiz" },
];

const isExpired = (l: ShareLink) => !!l.expiresAt && toISODate(new Date()) > l.expiresAt;

export default function SharePage() {
  const session = useSession();
  const all = useStore((s) => s.shareLinks);
  const removeShareLink = useStore((s) => s.removeShareLink);
  const links = useMemo(() => all.filter((l) => l.ownerId === session?.id), [all, session?.id]);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState<ShareLink | null>(null);

  async function remove(l: ShareLink) {
    if (!(await confirmAction({
      title: "Link listeden kaldırılsın mı?",
      message:
        "Link bu listeden silinir. Daha önce gönderdiğiniz link ise son geçerlilik tarihine kadar açılmaya devam eder — proje verisi linkin içinde taşınıyor.",
      danger: true,
      confirmText: "Kaldır",
    }))) return;
    removeShareLink(l.id);
  }

  return (
    <>
      <PageHeader
        title="Paylaşım Linkleri"
        description="Projenin raporunu salt okunur bir linkle e-posta, WhatsApp, mesaj veya karekodla gönderin"
        icon={Share2}
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={14} /> Link Oluştur
          </Button>
        }
      />

      <Card className="mb-4">
        <CardTitle>Oluşturulan linkler</CardTitle>
        {links.length === 0 ? (
          <p className="text-sm text-text2">
            Henüz link oluşturmadınız. <b>Link Oluştur</b> ile bir proje seçin; linki açan kişi o projenin raporunu
            görür, giriş yapması gerekmez.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text3 border-b border-border">
                  <th className="py-2 px-1 font-medium">Proje</th>
                  <th className="py-2 px-1 font-medium">Oluşturma</th>
                  <th className="py-2 px-1 font-medium">Geçerlilik</th>
                  <th className="py-2 px-1" />
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 px-1 font-medium text-text" data-no-i18n>{l.projectName}</td>
                    <td className="py-2.5 px-1 text-text2 whitespace-nowrap">{formatDate(l.createdAt)}</td>
                    <td className="py-2.5 px-1 whitespace-nowrap">
                      {isExpired(l) ? (
                        <Badge variant="red">Süresi doldu</Badge>
                      ) : l.expiresAt ? (
                        <span className="text-text2">{formatDate(l.expiresAt)}</span>
                      ) : (
                        <span className="text-text2">Süresiz</span>
                      )}
                    </td>
                    <td className="py-2.5 px-1">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => setSending(l)} disabled={isExpired(l)}>
                          <Send size={13} /> Gönder
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(l)} aria-label="Listeden kaldır">
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Link nasıl çalışır?</CardTitle>
        <ul className="text-sm text-text2 space-y-1.5 list-disc list-inside ml-1">
          <li>Linki açan kişi projenin raporunu görür ve PDF olarak kaydedebilir; projeyi değiştiremez.</li>
          <li>
            Link, <b>oluşturulduğu andaki</b> proje verisini taşır. Projede sonradan yaptığınız değişiklikler
            gönderilmiş linke yansımaz — güncel hâli için yeni link oluşturun.
          </li>
          <li>Süresi dolan link açılmaz. Listeden kaldırmak, gönderilmiş linki kapatmaz.</li>
        </ul>
      </Card>

      {creating && (
        <CreateDialog
          onClose={() => setCreating(false)}
          onCreated={(l) => { setCreating(false); setSending(l); }}
        />
      )}
      {sending && <SendDialog link={sending} onClose={() => setSending(null)} />}
    </>
  );
}

// ---------------------------------------------------------------------------

function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn("bg-white rounded-2xl shadow-large w-full max-h-[92vh] overflow-y-auto", wide ? "max-w-xl" : "max-w-md")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-display font-extrabold text-base text-text tracking-tight">{title}</h3>
          <button type="button" onClick={onClose} className="text-text3 hover:text-text2 p-1 -mr-1" aria-label="Kapat">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (l: ShareLink) => void }) {
  const session = useSession();
  const projects = useMyProjects();
  const addShareLink = useStore((s) => s.addShareLink);
  const [projectId, setProjectId] = useState("");
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    const p = projects.find((x) => x.id === projectId);
    if (!p || !session) { setError("Lütfen paylaşılacak projeyi seçin."); return; }
    setBusy(true);
    setError(null);
    try {
      const now = new Date();
      const expiresAt = days > 0 ? toISODate(addDays(now, days)) : null;
      const code = await encodeShare({
        v: 1, n: p.name, k: p.kind, i: p.inputs, by: session.fullName, c: now.toISOString(), ...(expiresAt ? { e: expiresAt } : {}),
      });
      const link: ShareLink = {
        id: `shr_${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        ownerId: session.id,
        projectId: p.id,
        projectName: p.name,
        url: shareUrl(code),
        createdAt: now.toISOString(),
        expiresAt,
      };
      addShareLink(link);
      onCreated(link);
    } catch {
      setError("Link oluşturulamadı. Tarayıcınız güncel değilse güncelleyip tekrar deneyin.");
      setBusy(false);
    }
  }

  return (
    <Dialog title="Link oluştur" onClose={onClose}>
      {projects.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-text2">Paylaşmak için önce bir proje kaydetmeniz gerekiyor.</p>
          <Link href="/projects/new" className="inline-flex text-sm font-semibold text-accent hover:underline">
            Yeni proje oluştur →
          </Link>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); create(); }}
        >
          <label className="block">
            <span className="block text-xs font-semibold text-text2 mb-1.5">Hangi proje paylaşılacak?</span>
            <select
              autoFocus
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setError(null); }}
              className="w-full h-10 px-3 rounded-lg bg-white border border-border2 text-sm text-text focus:outline-none focus:border-accent focus:shadow-focus"
            >
              <option value="">Proje adı seçin…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {KIND_SHORT[p.kind]}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="block text-xs font-semibold text-text2 mb-1.5">Geçerlilik süresi</span>
            <div className="grid grid-cols-4 gap-1.5">
              {VALIDITY.map((v) => (
                <button
                  key={v.days}
                  type="button"
                  onClick={() => setDays(v.days)}
                  className={cn(
                    "h-9 rounded-lg border text-xs font-semibold transition-colors",
                    days === v.days ? "border-accent bg-accent/10 text-accent" : "border-border2 text-text2 hover:bg-bg2"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Vazgeç</Button>
            <Button type="submit" variant="accent" disabled={busy || !projectId}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Link oluştur
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43a9.38 9.38 0 0 1 9.42 9.44c0 5.2-4.23 9.43-9.44 9.43zm8.03-17.46A11.32 11.32 0 0 0 12.05.72C5.79.72.7 5.8.7 12.06c0 2 .52 3.95 1.52 5.67L.6 23.6l6.02-1.58a11.33 11.33 0 0 0 5.42 1.38h.01c6.26 0 11.35-5.09 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02z" />
    </svg>
  );
}

function SendDialog({ link, onClose }: { link: ShareLink; onClose: () => void }) {
  const session = useSession();
  const toast = useToast((s) => s.push);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const en = appLocale() === "en";
  const subject = en ? `${link.projectName} — feasibility report` : `${link.projectName} — fizibilite raporu`;
  const body = en
    ? `Hello,\n\nYou can view the feasibility report of the “${link.projectName}” project at the link below:\n\n${link.url}\n\n` +
      (link.expiresAt ? `The link is valid until ${formatDate(link.expiresAt)}.\n\n` : "") +
      (session?.fullName ?? "")
    : `Merhaba,\n\n“${link.projectName}” projesinin fizibilite raporunu aşağıdaki linkten görüntüleyebilirsiniz:\n\n${link.url}\n\n` +
      (link.expiresAt ? `Link ${formatDate(link.expiresAt)} tarihine kadar geçerlidir.\n\n` : "") +
      (session?.fullName ?? "");
  const shortText = en ? `“${link.projectName}” feasibility report: ${link.url}` : `“${link.projectName}” fizibilite raporu: ${link.url}`;

  useEffect(() => {
    QRCode.toDataURL(link.url, { errorCorrectionLevel: "L", margin: 2, width: 320, color: { dark: "#0B2350", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [link.url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Kopyalanamadı — linki seçip elle kopyalayın.", "error");
    }
  }

  function downloadQr() {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `${link.projectName.replace(/[^\p{L}\p{N}]+/gu, "-")}-karekod.png`;
    a.click();
  }

  const channel =
    "flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl border border-border2 text-xs font-semibold text-text2 hover:bg-bg2 hover:text-text transition-colors";

  return (
    <Dialog title={`Gönder — ${link.projectName}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div>
          <span className="block text-xs font-semibold text-text2 mb-1.5">Proje linki</span>
          <div className="flex items-center gap-2">
            <Input value={link.url} readOnly onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
            <Button onClick={copy} variant="accent" className="shrink-0">
              {copied ? <><Check size={14} /> Kopyalandı</> : <><Copy size={14} /> Kopyala</>}
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-text3">
            {link.expiresAt ? `${formatDate(link.expiresAt)} tarihine kadar geçerli.` : "Süresiz."}{" "}
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
              Linki aç <ExternalLink size={11} />
            </a>
          </p>
        </div>

        <div>
          <span className="block text-xs font-semibold text-text2 mb-1.5">Gönderme seçenekleri</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <a className={channel} href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>
              <Mail size={18} /> E-posta
            </a>
            <a className={channel} href={`https://wa.me/?text=${encodeURIComponent(shortText)}`} target="_blank" rel="noopener noreferrer">
              <span className="text-[#25D366]"><WhatsAppIcon size={18} /></span> WhatsApp
            </a>
            <a className={channel} href={`sms:?&body=${encodeURIComponent(shortText)}`}>
              <MessageSquare size={18} /> Mesaj (SMS)
            </a>
            <button type="button" className={cn(channel, showQr && "border-accent text-accent bg-accent/5")} onClick={() => setShowQr((v) => !v)}>
              <QrCode size={18} /> Karekod
            </button>
          </div>
          <p className="mt-1.5 text-xs text-text3">
            Mesaj seçeneği telefonda SMS uygulamasını açar; bilgisayarda telefonunuz bağlıysa (ör. Windows “Telefon
            Bağlantısı”, Mac “Mesajlar”) oradan gönderilir.
            {canNativeShare && (
              <>
                {" "}
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={() => navigator.share({ title: subject, text: shortText, url: link.url }).catch(() => {})}
                >
                  Diğer uygulamalarla paylaş
                </button>
              </>
            )}
          </p>
        </div>

        {showQr && (
          <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-border p-4">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt={`${link.projectName} karekodu`} width={180} height={180} className="rounded-lg" />
            ) : (
              <div className="w-[180px] h-[180px] flex items-center justify-center text-xs text-text3">Karekod üretilemedi</div>
            )}
            <div className="text-sm text-text2 space-y-3">
              <p>Telefon kamerasıyla okutunca rapor açılır. Sunumda ekrana yansıtabilir veya PNG olarak indirip dokümana ekleyebilirsiniz.</p>
              <Button variant="outline" size="sm" onClick={downloadQr} disabled={!qr}>
                <Download size={13} /> PNG indir
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
