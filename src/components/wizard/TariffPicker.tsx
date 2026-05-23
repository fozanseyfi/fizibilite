'use client';

import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InfoTooltip, TOOLTIPS } from '@/components/ui/info-tooltip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ConsumerGroup, TariffConfig } from '@/lib/types';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Abone grubu seçilince 2026 EPDK 14461 değerleri otomatik yüklenir.
 * Yan toggle ile fiyat kaynağı/açıklaması açılır.
 */

interface TariffPreset {
  consumerGroup: ConsumerGroup;
  label: string;
  purchasePriceTlKwh: number;       // alt kademe veya tek terimli (vergi/fon hariç toplam)
  salePriceTlKwh: number;            // mahsuplaşma + ihtiyaç fazlası satış
  distributionFeeTlKwh: number;
  vatPct: number;
  consumptionTaxPct: number;
  source: string;
}

const PRESETS_2026: Record<ConsumerGroup, TariffPreset> = {
  MESKEN: {
    consumerGroup: 'MESKEN',
    label: 'Mesken (AG)',
    purchasePriceTlKwh: 2.92,
    salePriceTlKwh: 2.50,
    distributionFeeTlKwh: 1.84,
    vatPct: 0.01,
    consumptionTaxPct: 0.05,
    source: 'EPDK Kurul Kararı No: 14461 (02.04.2026). Mesken AG alt kademe (≤240 kWh/ay) 2.92 TL/kWh. Üst kademe 4.32 TL/kWh.',
  },
  TICARETHANE_LV: {
    consumerGroup: 'TICARETHANE_LV',
    label: 'Ticarethane (AG)',
    purchasePriceTlKwh: 5.35,
    salePriceTlKwh: 4.80,
    distributionFeeTlKwh: 1.88,
    vatPct: 0.20,
    consumptionTaxPct: 0.05,
    source: 'EPDK 14461 — Ticarethane AG alt kademe (≤30 kWh/gün) 5.35 TL/kWh. Üst kademe 5.93 TL/kWh. BTV %5, KDV %20.',
  },
  TICARETHANE_MV: {
    consumerGroup: 'TICARETHANE_MV',
    label: 'Ticarethane (OG)',
    purchasePriceTlKwh: 4.90,
    salePriceTlKwh: 4.50,
    distributionFeeTlKwh: 1.20,
    vatPct: 0.20,
    consumptionTaxPct: 0.05,
    source: 'EPDK 14461 — Ticarethane OG ~%10 daha düşük (dağıtım kaybı azlığı). TODO: Excel\'den doğrulanmalı.',
  },
  SANAYI_LV: {
    consumerGroup: 'SANAYI_LV',
    label: 'Sanayi (AG)',
    purchasePriceTlKwh: 4.81,
    salePriceTlKwh: 4.40,
    distributionFeeTlKwh: 1.39,
    vatPct: 0.20,
    consumptionTaxPct: 0.01,
    source: 'EPDK 14461 — Sanayi AG tek terimli 4.81 TL/kWh. BTV %1 (sanayi), KDV %20.',
  },
  SANAYI_MV: {
    consumerGroup: 'SANAYI_MV',
    label: 'Sanayi (OG)',
    purchasePriceTlKwh: 4.05,
    salePriceTlKwh: 3.70,
    distributionFeeTlKwh: 0.50,
    vatPct: 0.20,
    consumptionTaxPct: 0.01,
    source: 'EPDK 14461 — Sanayi OG ~%15 daha düşük. TODO: Excel\'den doğrulanmalı.',
  },
  TARIMSAL_SULAMA: {
    consumerGroup: 'TARIMSAL_SULAMA',
    label: 'Tarımsal Sulama',
    purchasePriceTlKwh: 4.37,
    salePriceTlKwh: 4.00,
    distributionFeeTlKwh: 1.50,
    vatPct: 0.01,
    consumptionTaxPct: 0.01,
    source: 'EPDK 14461 — Tarımsal sulama 4.37 TL/kWh (sübvansiyonlu). KDV %1, BTV %1.',
  },
  AYDINLATMA: {
    consumerGroup: 'AYDINLATMA',
    label: 'Aydınlatma',
    purchasePriceTlKwh: 4.50,
    salePriceTlKwh: 4.00,
    distributionFeeTlKwh: 1.50,
    vatPct: 0.20,
    consumptionTaxPct: 0.05,
    source: 'EPDK 14461 — Genel aydınlatma. TODO: Excel\'den doğrulanmalı.',
  },
};

export function TariffPicker({
  tariff,
  onChange,
}: {
  tariff: TariffConfig;
  onChange: (next: TariffConfig) => void;
}) {
  const [showSources, setShowSources] = useState(false);
  const preset = PRESETS_2026[tariff.consumerGroup];

  function applyConsumerGroup(group: ConsumerGroup) {
    const p = PRESETS_2026[group];
    onChange({
      ...tariff,
      consumerGroup: group,
      purchasePriceTlKwh: p.purchasePriceTlKwh,
      salePriceTlKwh: p.salePriceTlKwh,
      distributionFeeTlKwh: p.distributionFeeTlKwh,
      vatPct: p.vatPct,
      consumptionTaxPct: p.consumptionTaxPct,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            Abone Grubu
            <InfoTooltip title="Abone Grubu" body="EPDK tarafından tarife belirlenirken abone tipine göre 7 ana grup vardır. Seçim, vergi oranlarını ve KDV'yi de otomatik ayarlar." />
          </Label>
          <Select value={tariff.consumerGroup} onValueChange={(v) => applyConsumerGroup(v as ConsumerGroup)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MESKEN">Mesken (aylık mahsup)</SelectItem>
              <SelectItem value="TICARETHANE_LV">Ticarethane AG</SelectItem>
              <SelectItem value="TICARETHANE_MV">Ticarethane OG</SelectItem>
              <SelectItem value="SANAYI_LV">Sanayi AG</SelectItem>
              <SelectItem value="SANAYI_MV">Sanayi OG</SelectItem>
              <SelectItem value="TARIMSAL_SULAMA">Tarımsal Sulama</SelectItem>
              <SelectItem value="AYDINLATMA">Aydınlatma</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowSources((s) => !s)} className="w-full">
            <Info className="h-4 w-4 mr-2" />
            Fiyat kaynağı {showSources ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
        </div>
      </div>

      {showSources && (
        <Card className="bg-secondary/30 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">📜 EPDK Karar 14461 — Tarife Kaynağı</CardTitle>
            <CardDescription className="text-xs">02.04.2026 tarihli, 04.04.2026'da Resmi Gazete'de yayımlanan kararı baz alır.</CardDescription>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div><strong>{preset.label}:</strong> {preset.source}</div>
            <table className="w-full mt-2 text-[11px]">
              <tbody>
                <tr><td className="py-0.5 text-muted-foreground">Alış fiyatı:</td><td className="text-right font-mono">{preset.purchasePriceTlKwh.toFixed(2)} TL/kWh</td></tr>
                <tr><td className="py-0.5 text-muted-foreground">Satış fiyatı:</td><td className="text-right font-mono">{preset.salePriceTlKwh.toFixed(2)} TL/kWh</td></tr>
                <tr><td className="py-0.5 text-muted-foreground">Dağıtım bedeli:</td><td className="text-right font-mono">{preset.distributionFeeTlKwh.toFixed(2)} TL/kWh</td></tr>
                <tr><td className="py-0.5 text-muted-foreground">KDV:</td><td className="text-right font-mono">%{(preset.vatPct * 100).toFixed(0)}</td></tr>
                <tr><td className="py-0.5 text-muted-foreground">BTV:</td><td className="text-right font-mono">%{(preset.consumptionTaxPct * 100).toFixed(0)}</td></tr>
              </tbody>
            </table>
            <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
              Detaylı kaynak: <code>docs/tariffs_sources.md</code> · Admin paneli: <code>/api/admin/tariffs/current</code>
              <br />Fiyatlar EPDK güncellemelerinde otomatik scraper ile takip edilir; manuel olarak da güncellenebilir.
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs">
            Alış Fiyatı (TL/kWh)
            <InfoTooltip title="Alış Fiyatı" body="Şebekeden çektiğin elektriğin birim fiyatı. Auto-doldurulur, gerekirse override edebilirsin." />
          </Label>
          <Input
            type="number"
            step="0.01"
            value={tariff.purchasePriceTlKwh}
            onChange={(e) => onChange({ ...tariff, purchasePriceTlKwh: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs">
            Satış Fiyatı (TL/kWh)
            <InfoTooltip title="Satış Fiyatı" body="İhtiyaç fazlası üretimin sattığın fiyat. Mahsuplaşılan kısma da bu fiyat uygulanır (görevli tedarik şirketinden alışta)." />
          </Label>
          <Input
            type="number"
            step="0.01"
            value={tariff.salePriceTlKwh}
            onChange={(e) => onChange({ ...tariff, salePriceTlKwh: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs">
            Dağıtım Bedeli (TL/kWh)
            <InfoTooltip title="Dağıtım Bedeli" body="TEDAŞ koordinasyonunda her görevli tedarik şirketi aynı tarifeyi uygular. Mesken AG ~1.84, Ticarethane ~1.88, Sanayi AG ~1.39." />
          </Label>
          <Input
            type="number"
            step="0.01"
            value={tariff.distributionFeeTlKwh}
            onChange={(e) => onChange({ ...tariff, distributionFeeTlKwh: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Elektrik Fiyat Artışı (% yıllık)</Label>
          <Input
            type="number"
            step="0.5"
            value={tariff.electricityInflationPct}
            onChange={(e) => onChange({ ...tariff, electricityInflationPct: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
    </div>
  );
}
