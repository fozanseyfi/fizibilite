'use client';

import { useMemo } from 'react';
import { estimateHome, defaultHome, type HomeAnswers } from '@/lib/models/ci/home-estimate';
import { nf } from '@/lib/models/fmt';

/** Mesken — birkaç kısa soruyla yıllık tüketim tahmini. "Uygula" yıllık tüketimi ve aylık dağılımı doldurur. */
export function HomeEstimator({
  value,
  onChange,
  onApply,
  consY,
}: {
  value?: HomeAnswers;
  onChange: (a: HomeAnswers) => void;
  onApply: (total: number, monthlyPct: number[]) => void;
  consY: number;
}) {
  const a = value ?? defaultHome();
  const est = useMemo(() => estimateHome(a), [a]);
  const total = Math.round(est.total / 10) * 10;
  const set = <K extends keyof HomeAnswers>(k: K, v: HomeAnswers[K]) => onChange({ ...a, [k]: v });
  const applied = Math.abs(consY - total) < 1;

  const sel = (label: string, k: keyof HomeAnswers, opts: [string, string][]) => (
    <div className="field">
      <label>{label}</label>
      <select value={String(a[k])} onChange={(e) => set(k, e.target.value as never)}>
        {opts.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );
  const num = (label: string, k: 'people' | 'ac' | 'evKm', min: number, max: number, step = 1, disabled = false) => (
    <div className="field">
      <label>{label}</label>
      <input type="number" min={min} max={max} step={step} value={a[k]} disabled={disabled}
        onChange={(e) => set(k, Math.max(min, Math.min(max, Number(e.target.value) || 0)))} />
    </div>
  );
  const yes = (label: string, k: 'ev' | 'pool' | 'wfh') => (
    <label className="chk"><input type="checkbox" checked={a[k]} onChange={(e) => set(k, e.target.checked)} /> {label}</label>
  );

  return (
    <div className="home-est">
      <div className="grid3">
        {num('Hanede kaç kişi yaşıyor?', 'people', 1, 8)}
        {sel('Konut', 'home', [['small', 'Daire · 100 m² ve altı'], ['large', 'Daire · 100 m² üstü'], ['detached', 'Müstakil ev / villa']])}
        {sel('Isınma', 'heating', [['gas', 'Doğalgaz kombi'], ['heatpump', 'Klima / ısı pompası'], ['electric', 'Elektrikli ısıtıcı / yağlı radyatör'], ['other', 'Soba / kalorifer (elektriksiz)']])}
        {sel('Sıcak su', 'water', [['gas', 'Doğalgaz kombi'], ['electric', 'Elektrikli termosifon'], ['solar', 'Güneş kolektörü']])}
        {sel('Ocak / fırın', 'cooking', [['gas', 'Doğalgaz'], ['electric', 'Elektrikli / indüksiyon']])}
        {num('Yazın kullanılan klima sayısı', 'ac', 0, 8)}
      </div>
      <div className="home-yes">
        {yes('Elektrikli araç (evde şarj)', 'ev')}
        {a.ev && <span className="home-km">{num('Yıllık km', 'evKm', 0, 60000, 1000)}</span>}
        {yes('Havuz', 'pool')}
        {yes('Evden çalışan var', 'wfh')}
      </div>

      <div className="home-out">
        <div className="home-total">
          <span>Tahmini yıllık tüketim</span>
          <b>{nf(total)} kWh</b>
          <small>≈ aylık ortalama {nf(total / 12)} kWh</small>
        </div>
        <table className="home-parts">
          <tbody>
            {est.parts.map((p) => (
              <tr key={p.label}><td>{p.label}</td><td>{nf(p.kwh)} kWh</td></tr>
            ))}
          </tbody>
        </table>
        <div className="home-act">
          <button type="button" className="btn-mini primary" onClick={() => onApply(total, est.monthlyPct)} disabled={applied}>
            {applied ? '✓ Tahmin uygulandı' : 'Bu tahmini uygula'}
          </button>
          <p className="tsub">Yıllık tüketimi ve aylık dağılımı (kış ısınma, yaz klima) doldurur. Faturanız varsa yıllık tüketimi doğrudan yazmanız daha doğrudur.</p>
        </div>
      </div>
    </div>
  );
}
