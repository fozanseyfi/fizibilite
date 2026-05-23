'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { CoverageResult, DEFAULT_BANK_THRESHOLDS } from '@/lib/pf/types';
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export function CoverageTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<CoverageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/coverage/${projectId}`)
      .then(async (r) => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error || 'Coverage hesabı başarısız');
        }
        return r.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setErr(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  if (loading) {
    return <Card><CardContent className="py-12 text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" /></CardContent></Card>;
  }
  if (err || !data) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">{err ?? 'Veri yok'}</CardContent></Card>;
  }

  const t = DEFAULT_BANK_THRESHOLDS;
  const statusConfig = {
    green: { icon: CheckCircle2, label: 'Banka onayına uygun', color: 'border-l-eco text-eco-dark bg-eco/5', verdict: 'Bu proje tipik bir proje finansmanı bankasının onayını alabilir. Tüm coverage oranları eşiklerin üzerinde.' },
    yellow: { icon: AlertTriangle, label: 'Borderline', color: 'border-l-amber-400 text-amber-800 bg-amber-50', verdict: 'DSCR borderline veya bazı oranlar hedef altında. Equity-to-cure sözleşmesi veya yapısal revizyon gerekebilir.' },
    red: { icon: XCircle, label: 'Bankability sorunu', color: 'border-l-destructive text-destructive bg-destructive/5', verdict: 'Min DSCR < 1.20 banka kırmızı çizgisinin altında. Yapısal değişiklik zorunlu: daha düşük kredi oranı, daha uzun vade, veya tarife/PPA optimizasyonu.' },
  }[data.bankApprovalStatus];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`rounded-xl border-l-4 p-4 ${statusConfig.color}`}>
        <div className="flex items-start gap-3">
          <StatusIcon className="h-6 w-6 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold">{statusConfig.label}</div>
            <div className="text-xs mt-1">{statusConfig.verdict}</div>
            {data.failedThresholds.length > 0 && (
              <ul className="text-xs mt-2 space-y-0.5 list-disc list-inside">
                {data.failedThresholds.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 4 KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Min DSCR" value={data.minDscr.toFixed(2)} accent={data.minDscr >= t.minDscrTarget ? 'eco' : 'navy'} sub={`Banka eşik: ${t.minDscrFloor.toFixed(2)}`} />
        <KpiCard label="Avg DSCR" value={data.avgDscr.toFixed(2)} accent={data.avgDscr >= t.avgDscrTarget ? 'eco' : 'navy'} sub={`Hedef: ${t.avgDscrTarget.toFixed(2)}`} />
        <KpiCard label="LLCR" value={data.llcr.toFixed(2)} accent={data.llcr >= t.llcrTarget ? 'eco' : 'navy'} sub={`Hedef: ${t.llcrTarget.toFixed(2)}`} />
        <KpiCard label="PLCR" value={data.plcr.toFixed(2)} accent={data.plcr >= t.plcrTarget ? 'eco' : 'navy'} sub={`Hedef: ${t.plcrTarget.toFixed(2)}`} />
      </div>

      {/* Çeyreklik DSCR grafiği */}
      <Card>
        <CardHeader>
          <CardTitle>Çeyreklik DSCR Trendi</CardTitle>
          <CardDescription>Bankalar DSCR'i çeyreklik izler. 1.20 altı kırmızı çizgi (kovenant breach).</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.dscrQuarterly.map((v, i) => ({ q: `Q${i + 1}`, dscr: v }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="q" />
              <YAxis domain={[0, 'dataMax + 0.5']} />
              <Tooltip formatter={(v: number) => v.toFixed(2)} />
              <ReferenceLine y={t.minDscrFloor} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Floor 1.20', position: 'right', fontSize: 10, fill: '#ef4444' }} />
              <ReferenceLine y={t.minDscrTarget} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Target 1.30', position: 'right', fontSize: 10, fill: '#f59e0b' }} />
              <Line type="monotone" dataKey="dscr" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Eşik tablosu */}
      <Card>
        <CardHeader><CardTitle>Banka Eşikleri Karşılaştırma</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-2 whitespace-nowrap">Metrik</th>
                <th className="text-right p-2 whitespace-nowrap">Senin Değerin</th>
                <th className="text-right p-2 whitespace-nowrap">Banka Eşiği</th>
                <th className="text-right p-2 whitespace-nowrap">Durum</th>
              </tr>
            </thead>
            <tbody>
              <ThresholdRow label="Min DSCR" actual={data.minDscr} threshold={t.minDscrFloor} kind="floor" />
              <ThresholdRow label="Min DSCR (target)" actual={data.minDscr} threshold={t.minDscrTarget} kind="target" />
              <ThresholdRow label="Avg DSCR" actual={data.avgDscr} threshold={t.avgDscrTarget} kind="target" />
              <ThresholdRow label="LLCR" actual={data.llcr} threshold={t.llcrTarget} kind="target" />
              <ThresholdRow label="PLCR" actual={data.plcr} threshold={t.plcrTarget} kind="target" />
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ThresholdRow({ label, actual, threshold, kind }: { label: string; actual: number; threshold: number; kind: 'floor' | 'target' }) {
  const passed = actual >= threshold;
  return (
    <tr className="border-b border-border/30">
      <td className="p-2 whitespace-nowrap">{label}</td>
      <td className="p-2 text-right tabular-nums whitespace-nowrap font-medium">{actual.toFixed(2)}</td>
      <td className="p-2 text-right tabular-nums whitespace-nowrap text-muted-foreground">≥ {threshold.toFixed(2)} {kind === 'floor' && '(kırmızı)'}</td>
      <td className="p-2 text-right whitespace-nowrap">
        {passed ? <span className="text-eco-dark font-bold">✓ Geçti</span> : <span className={kind === 'floor' ? 'text-destructive font-bold' : 'text-amber-600 font-bold'}>{kind === 'floor' ? '✗ Kırmızı' : '⚠ Borderline'}</span>}
      </td>
    </tr>
  );
}
