"use client";

import { useEffect, useState } from "react";
import { Printer, AlertTriangle, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { buildReportHtml } from "@/components/models/native/project-report";
import { decodeShare, isExpired, payloadToProject, type SharePayload } from "@/lib/share-link";
import { formatDate } from "@/lib/utils";

type State =
  | { s: "loading" }
  | { s: "invalid" }
  | { s: "expired"; p: SharePayload }
  | { s: "ok"; p: SharePayload; html: string };

/** Paylaşım linki: oturum gerektirmez, rapor linkteki veriden üretilir (bkz. lib/share-link.ts). */
export default function SharedReportPage() {
  const [st, setSt] = useState<State>({ s: "loading" });

  useEffect(() => {
    const load = async () => {
      const code = window.location.hash.slice(1);
      const p = code ? await decodeShare(code) : null;
      if (!p) return setSt({ s: "invalid" });
      if (isExpired(p)) return setSt({ s: "expired", p });
      try {
        setSt({ s: "ok", p, html: buildReportHtml(payloadToProject(p)) });
        document.title = `${p.n} — Fizibilite Raporu`;
      } catch {
        setSt({ s: "invalid" });
      }
    };
    load();
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F6FA] print:bg-white">
      <header className="sticky top-0 z-10 border-b border-border bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1060px] items-center gap-3 px-4 py-3">
          <BrandMark className="h-8 w-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-text">{st.s === "ok" || st.s === "expired" ? st.p.n : "Fizibilite Raporu"}</div>
            {st.s === "ok" && (
              <div className="truncate text-xs text-text3">
                {st.p.by ? `${st.p.by} tarafından paylaşıldı · ` : ""}
                {formatDate(st.p.c)}
                {st.p.e ? ` · ${formatDate(st.p.e)} tarihine kadar geçerli` : ""}
              </div>
            )}
          </div>
          {st.s === "ok" && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0B2350] px-3.5 text-sm font-semibold text-white hover:bg-[#13306b]"
            >
              <Printer size={15} /> <span className="hidden sm:inline">PDF olarak kaydet</span>
            </button>
          )}
        </div>
      </header>

      {st.s === "loading" && (
        <div className="flex justify-center py-24 text-text3">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {(st.s === "invalid" || st.s === "expired") && (
        <div className="mx-auto mt-16 max-w-md px-4">
          <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-soft">
            <AlertTriangle className="mx-auto mb-3 text-yellow" size={28} />
            <h1 className="mb-2 text-lg font-extrabold text-text">
              {st.s === "expired" ? "Bu linkin süresi dolmuş" : "Link açılamadı"}
            </h1>
            <p className="text-sm text-text2">
              {st.s === "expired"
                ? `“${st.p.n}” raporunun linki ${formatDate(st.p.e!)} tarihinde sona erdi. Güncel link için gönderen kişiyle iletişime geçin.`
                : "Link eksik ya da bozuk görünüyor. Mesajdaki linkin tamamını kopyaladığınızdan emin olun."}
            </p>
          </div>
        </div>
      )}

      {st.s === "ok" && (
        <main className="mx-auto max-w-[1060px] px-3 py-5 sm:px-4 sm:py-8 print:p-0">
          <div className="shared-report overflow-x-auto rounded-xl bg-white p-4 shadow-soft sm:p-8 print:rounded-none print:p-0 print:shadow-none">
            <div id="mdl-report" style={{ display: "block" }} dangerouslySetInnerHTML={{ __html: st.html }} />
          </div>
          <p className="mt-4 text-center text-xs text-text3 print:hidden">
            Bu rapor salt okunurdur. Rakamlar, link oluşturulduğu andaki proje girdilerine göre hesaplanmıştır.
          </p>
        </main>
      )}
    </div>
  );
}
