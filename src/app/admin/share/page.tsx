"use client";

import { useState } from "react";
import { Share2, Copy, Check, Plus, X } from "lucide-react";
import { useStore } from "@/lib/admin-store";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardTitle } from "@/components/admin/card";
import { Button } from "@/components/admin/button";
import { Input } from "@/components/admin/input";
import { Badge } from "@/components/admin/badge";
import { Alert } from "@/components/admin/alert";
import { confirmAction } from "@/components/admin/confirm";
import { formatDate, uid, toISODate, addDays } from "@/lib/utils";

export default function SharePage() {
  const shareLink = useStore((s) => s.shareLink);
  const setShareLink = useStore((s) => s.setShareLink);
  const [copied, setCopied] = useState(false);

  function createToken() {
    const token = uid("shr").replace(/_/g, "");
    const now = new Date();
    setShareLink({
      token,
      createdAt: now.toISOString(),
      expiresAt: toISODate(addDays(now, 30)),
    });
  }

  async function revoke() {
    if (!(await confirmAction({
      title: "Public link iptal edilsin mi?",
      message: "Mevcut paylaşım linki devre dışı kalır. Bu link ile fizibilite raporlarını görüntüleyenler artık erişemez.",
      danger: true,
      confirmText: "İptal Et",
    }))) return;
    setShareLink(null);
  }

  function copyLink() {
    if (!shareLink) return;
    const url = `${window.location.origin}/p/${shareLink.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <PageHeader
        title="Public Paylaşım"
        description="Müşteriye/yatırımcıya read-only fizibilite raporu linki gönder"
        icon={Share2}
      />

      <Card className="mb-4">
        <CardTitle>Public Link Durumu</CardTitle>
        {!shareLink ? (
          <div className="space-y-3">
            <p className="text-sm text-text2">
              Henüz public link oluşturulmamış. Yatırımcıya veya müşteriye gönderebileceğin read-only bir fizibilite
              raporu bağlantısı üretebilirsin.
            </p>
            <Button variant="accent" onClick={createToken}>
              <Plus size={14} /> Link Oluştur
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="green">Aktif</Badge>
              {shareLink.expiresAt && (
                <span className="text-xs text-text3">
                  Son geçerlilik: {formatDate(shareLink.expiresAt)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/p/${shareLink.token}`}
                readOnly
                className="font-mono text-xs"
              />
              <Button onClick={copyLink} variant="accent">
                {copied ? (
                  <>
                    <Check size={14} /> Kopyalandı
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Kopyala
                  </>
                )}
              </Button>
            </div>
            <Button variant="danger" onClick={revoke}>
              <X size={14} /> Linki İptal Et
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Görünür Modüller</CardTitle>
        <Alert variant="info" className="mb-3">
          Bu sürümde tüm okunabilir fizibilite modülleri (KPI Dashboard, Mahsuplaşma, Cash Flow özeti,
          PVGIS üretim grafiği) public link&apos;te gösterilir. Tarife sözleşme detayları ve iç finansman
          notları <strong>her zaman gizli</strong>.
        </Alert>
        <ul className="text-sm text-text2 space-y-1 list-disc list-inside ml-1">
          <li>KPI Dashboard (NPV, IRR, LCOE, Payback)</li>
          <li>PVGIS aylık/saatlik üretim grafikleri</li>
          <li>Mahsuplaşma sonuçları (saatlik vs aylık)</li>
          <li>Cash Flow özeti (yıllık, aggregate)</li>
          <li className="text-text3">EPC sözleşme & alt yüklenici detayları — gizli</li>
          <li className="text-text3">Banka koşulları (margin, swap, fee) — gizli</li>
        </ul>
      </Card>
    </>
  );
}
