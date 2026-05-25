"use client";

import { Users } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/admin/card";
import { Alert } from "@/components/admin/alert";

export default function UsersPage() {
  return (
    <>
      <PageHeader
        title="Kullanıcılar"
        description="Platforma erişimi olan tüm kullanıcılar"
        icon={Users}
      />
      <Card>
        <Alert variant="info">
          <strong>Çoklu kullanıcı modülü</strong> Supabase entegrasyonu sonrasında etkinleşecektir.
          Şu an tek kullanıcılı lokal modda çalışıyor. Hesap bilgilerinizi düzenlemek için
          &quot;Profilim&quot; sayfasını kullanın.
        </Alert>
      </Card>
    </>
  );
}
