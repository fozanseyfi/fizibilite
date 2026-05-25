"use client";

import { History } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/admin/card";
import { TableWrap, Table, THead, TBody, TR, TH, Empty } from "@/components/admin/table";
import { Alert } from "@/components/admin/alert";

export default function AuditPage() {
  return (
    <>
      <PageHeader
        title="Aktivite Kayıtları"
        description="Sistemdeki tüm yazma işlemlerinin kaydı (audit log)"
        icon={History}
      />

      <Alert variant="info" className="mb-4">
        <strong>Lokal sürümde</strong> audit log iskelet halindedir. Supabase entegrasyonu sonrası
        tüm proje oluşturma, simülasyon çalıştırma, tarife değişiklikleri ve kullanıcı işlemleri
        otomatik kaydedilecek; kim ne zaman ne değiştirdi tam izlenebilir.
      </Alert>

      <Card>
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Tarih</TH>
                <TH>Kullanıcı</TH>
                <TH>Aksiyon</TH>
                <TH>Varlık</TH>
              </TR>
            </THead>
            <TBody>
              <Empty colSpan={4}>Henüz kayıt yok. Supabase entegrasyonu sonrası dolacak.</Empty>
            </TBody>
          </Table>
        </TableWrap>
      </Card>
    </>
  );
}
