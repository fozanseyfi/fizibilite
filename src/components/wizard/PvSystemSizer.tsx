'use client';

/**
 * PVsyst-style PV System Sizer — 6 sequential cards:
 *   2. Panel Seç (library + selected spec card)
 *   3. İnvertör Seç (library + selected spec card)
 *   4. Hedef Kurulu Güç (kWp + kWe + Otomatik Boyutlandır)
 *   5. Otomatik String Sizing (read-only öneri)
 *   6. Kullanıcı Konfigürasyonu (override + validation)
 *
 * (Card 1 = Orientation/Tilt ve Card 7 = Sistem Kayıplari wizard'da ayrı kartlar olarak yer alır.)
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Cpu, Zap, Pencil, Plus, Check, X, AlertTriangle, CheckCircle2, Sigma, Trash2,
  Wand2, Layers, Settings,
} from 'lucide-react';
import { MODULE_LIBRARY, INVERTER_LIBRARY, ModuleSpec, InverterSpec } from '@/lib/pv-losses';
import { useStore } from '@/lib/admin-store';

interface PvSystemSizerProps {
  peakPowerKwp: number;
  onPeakPowerChange: (kwp: number) => void;
}

export function PvSystemSizer({ peakPowerKwp, onPeakPowerChange }: PvSystemSizerProps) {
  // ---------- Kütüphane state ----------
  const customModules = useStore((s) => s.customModules);
  const customInverters = useStore((s) => s.customInverters);
  const addCustomModule = useStore((s) => s.addCustomModule);
  const updateCustomModule = useStore((s) => s.updateCustomModule);
  const removeCustomModule = useStore((s) => s.removeCustomModule);
  const addCustomInverter = useStore((s) => s.addCustomInverter);
  const updateCustomInverter = useStore((s) => s.updateCustomInverter);
  const removeCustomInverter = useStore((s) => s.removeCustomInverter);

  const [selModule, setSelModule] = useState(0);
  const [selInverter, setSelInverter] = useState(0);

  // Hedef AC kapasite (kWe). Default: kWp/1.22 (typical DC/AC oranı)
  const [targetKwe, setTargetKwe] = useState<number>(() => Math.round(peakPowerKwp / 1.22));

  // Sıcaklık aralığı
  const [tMin, setTMin] = useState(-10);
  const [tMax, setTMax] = useState(70);

  // Kullanıcı override değerleri
  const [userPanelsPerString, setUserPanelsPerString] = useState<number | null>(null);
  const [userInverterCount, setUserInverterCount] = useState<number | null>(null);

  // Modal state
  const [editModuleIdx, setEditModuleIdx] = useState<number | null>(null);
  const [editInverterIdx, setEditInverterIdx] = useState<number | null>(null);
  const [addingModule, setAddingModule] = useState(false);
  const [addingInverter, setAddingInverter] = useState(false);

  const modules = useMemo<Array<{ spec: ModuleSpec; isCustom: boolean; customIdx?: number }>>(
    () => [
      ...MODULE_LIBRARY.map((m) => ({ spec: m, isCustom: false })),
      ...customModules.map((m, i) => ({ spec: m, isCustom: true, customIdx: i })),
    ],
    [customModules]
  );
  const inverters = useMemo<Array<{ spec: InverterSpec; isCustom: boolean; customIdx?: number }>>(
    () => [
      ...INVERTER_LIBRARY.map((i) => ({ spec: i, isCustom: false })),
      ...customInverters.map((i, idx) => ({ spec: i, isCustom: true, customIdx: idx })),
    ],
    [customInverters]
  );

  useEffect(() => {
    if (selModule >= modules.length) setSelModule(0);
    if (selInverter >= inverters.length) setSelInverter(0);
  }, [modules.length, inverters.length, selModule, selInverter]);

  const mod = modules[selModule]?.spec;
  const inv = inverters[selInverter]?.spec;

  // ---------- Otomatik String Sizing (PVsyst hesabı) ----------
  const autoSizing = useMemo(() => {
    if (!mod || !inv) return null;
    const STC_TEMP = 25;
    const tempCoeff = mod.tempCoeffPmaxPctPerC / 100;
    const vocTmin = mod.voc * (1 + tempCoeff * (tMin - STC_TEMP));
    const vmpTmax = mod.vmp * (1 + tempCoeff * (tMax - STC_TEMP));
    const mpptVMin = 200;

    const maxPanelsPerString = Math.floor(inv.maxInputVdc / vocTmin);
    const minPanelsPerString = Math.ceil(mpptVMin / vmpTmax);
    const recommendedPanels = Math.max(
      minPanelsPerString,
      Math.min(maxPanelsPerString, Math.floor(maxPanelsPerString * 0.92))
    );
    const totalModules = Math.round((peakPowerKwp * 1000) / mod.wp);
    const totalStrings = Math.max(1, Math.ceil(totalModules / recommendedPanels));
    const maxStringsPerInverter = inv.mpptCount * 2;
    const totalInverters = Math.max(1, Math.ceil(totalStrings / maxStringsPerInverter));
    const actualDcKw = (totalModules * mod.wp) / 1000;
    const totalAcKw = totalInverters * inv.acKw;
    const dcAcRatio = totalAcKw > 0 ? actualDcKw / totalAcKw : 0;
    const stringVocCold = vocTmin * recommendedPanels;
    const stringVmpHot = vmpTmax * recommendedPanels;

    return {
      vocTmin, vmpTmax, mpptVMin,
      maxPanelsPerString, minPanelsPerString, recommendedPanels,
      totalModules, totalStrings, totalInverters, maxStringsPerInverter,
      actualDcKw, totalAcKw, dcAcRatio,
      stringVocCold, stringVmpHot,
    };
  }, [mod, inv, peakPowerKwp, tMin, tMax]);

  // ---------- Kullanıcı override hesabı + validation ----------
  const userConfig = useMemo(() => {
    if (!mod || !inv || !autoSizing) return null;
    const panelsPerString = userPanelsPerString ?? autoSizing.recommendedPanels;
    const inverterCount = userInverterCount ?? autoSizing.totalInverters;

    const stringsTotal = Math.max(1, Math.ceil(autoSizing.totalModules / panelsPerString));
    const stringsPerInverter = inverterCount > 0 ? Math.ceil(stringsTotal / inverterCount) : 0;

    const vocAtTmin = mod.voc * (1 + (mod.tempCoeffPmaxPctPerC / 100) * (tMin - 25));
    const vmpAtTmax = mod.vmp * (1 + (mod.tempCoeffPmaxPctPerC / 100) * (tMax - 25));
    const stringVocCold = vocAtTmin * panelsPerString;
    const stringVmpHot = vmpAtTmax * panelsPerString;

    const actualDcKw = (autoSizing.totalModules * mod.wp) / 1000;
    const totalAcKw = inverterCount * inv.acKw;
    const dcAcRatio = totalAcKw > 0 ? actualDcKw / totalAcKw : 0;

    // ---------- Validation ----------
    const issues: Array<{ field: 'panels' | 'inverter' | 'dcAc'; level: 'warn' | 'error'; msg: string }> = [];
    if (panelsPerString > autoSizing.maxPanelsPerString) {
      issues.push({
        field: 'panels', level: 'error',
        msg: `Max ${autoSizing.maxPanelsPerString} panel/string (Voc(Tmin)=${vocAtTmin.toFixed(0)}V × ${panelsPerString} = ${stringVocCold.toFixed(0)}V > ${inv.maxInputVdc}V invertör limiti)`,
      });
    } else if (panelsPerString === autoSizing.maxPanelsPerString) {
      issues.push({ field: 'panels', level: 'warn', msg: `Sınırda — soğuk havada Voc invertör limitine çok yakın` });
    }
    if (panelsPerString < autoSizing.minPanelsPerString) {
      issues.push({
        field: 'panels', level: 'error',
        msg: `Min ${autoSizing.minPanelsPerString} panel/string (Vmp(Tmax)=${vmpAtTmax.toFixed(0)}V × ${panelsPerString} = ${stringVmpHot.toFixed(0)}V < 200V MPPT min)`,
      });
    }
    if (stringsPerInverter > autoSizing.maxStringsPerInverter) {
      issues.push({
        field: 'inverter', level: 'error',
        msg: `İnvertör başına max ${autoSizing.maxStringsPerInverter} string (${inv.mpptCount} MPPT × 2 paralel). Mevcut ${stringsPerInverter} — invertör sayısını artırın.`,
      });
    }
    if (dcAcRatio > 1.4) {
      issues.push({ field: 'dcAc', level: 'warn', msg: `DC/AC ${dcAcRatio.toFixed(2)} yüksek — invertör clipping kayıpları artar` });
    } else if (dcAcRatio > 1.5) {
      issues.push({ field: 'dcAc', level: 'error', msg: `DC/AC ${dcAcRatio.toFixed(2)} kabul edilemez seviyede` });
    } else if (dcAcRatio < 1.0) {
      issues.push({ field: 'dcAc', level: 'warn', msg: `DC/AC ${dcAcRatio.toFixed(2)} çok düşük — invertör atıl` });
    }
    if (inverterCount < 1) {
      issues.push({ field: 'inverter', level: 'error', msg: 'En az 1 invertör olmalı' });
    }

    return {
      panelsPerString, inverterCount, stringsTotal, stringsPerInverter,
      stringVocCold, stringVmpHot, actualDcKw, totalAcKw, dcAcRatio,
      issues,
      hasError: issues.some((i) => i.level === 'error'),
      hasWarn: issues.some((i) => i.level === 'warn'),
    };
  }, [mod, inv, autoSizing, userPanelsPerString, userInverterCount, tMin, tMax]);

  // ---------- Auto-size button (kWp/kWe'den itibaren recommend uygula) ----------
  function applyAutoSize() {
    setUserPanelsPerString(null);
    setUserInverterCount(null);
    // kWe'yi otomatik öneriye eşitle
    if (autoSizing) setTargetKwe(Math.round(autoSizing.totalAcKw));
  }

  // ---------- Modal callbacks ----------
  function handleSaveModule(spec: ModuleSpec, idx: number | null) {
    if (idx !== null) {
      if (modules[idx].isCustom && modules[idx].customIdx !== undefined) {
        updateCustomModule(modules[idx].customIdx, spec);
      } else {
        addCustomModule({ ...spec, model: spec.model + ' (özel)' });
      }
    }
    setEditModuleIdx(null);
  }
  function handleAddNewModule(spec: ModuleSpec) {
    addCustomModule(spec);
    setAddingModule(false);
    setSelModule(modules.length);
  }
  function handleSaveInverter(spec: InverterSpec, idx: number | null) {
    if (idx !== null) {
      if (inverters[idx].isCustom && inverters[idx].customIdx !== undefined) {
        updateCustomInverter(inverters[idx].customIdx, spec);
      } else {
        addCustomInverter({ ...spec, model: spec.model + ' (özel)' });
      }
    }
    setEditInverterIdx(null);
  }
  function handleAddNewInverter(spec: InverterSpec) {
    addCustomInverter(spec);
    setAddingInverter(false);
    setSelInverter(inverters.length);
  }

  return (
    <>
      <div className="space-y-5">
        {/* ============================================================
            CARD 2/7 — Panel Seç
           ============================================================ */}
        <SubCard
          step="2 / 7"
          eyebrow="PV Module Selection"
          title="Panel Seç"
          icon={Cpu}
          description="Modül kütüphaneden seç. Özel modül de ekleyebilirsin."
        >
          <div className="grid lg:grid-cols-[1fr_320px] gap-4">
            <LibraryList
              title="Modül Kütüphanesi"
              count={modules.length}
              customCount={customModules.length}
              onAdd={() => setAddingModule(true)}
              addLabel="Yeni Modül"
            >
              {modules.map((m, i) => (
                <ModuleCard
                  key={i}
                  spec={m.spec}
                  isCustom={m.isCustom}
                  selected={i === selModule}
                  onSelect={() => setSelModule(i)}
                  onEdit={() => setEditModuleIdx(i)}
                  onDelete={m.isCustom && m.customIdx !== undefined ? () => removeCustomModule(m.customIdx!) : undefined}
                />
              ))}
            </LibraryList>

            {mod && <SelectedModuleCard spec={mod} onEdit={() => setEditModuleIdx(selModule)} />}
          </div>
        </SubCard>

        {/* ============================================================
            CARD 3/7 — İnvertör Seç
           ============================================================ */}
        <SubCard
          step="3 / 7"
          eyebrow="Inverter Selection"
          title="İnvertör Seç"
          icon={Zap}
          description="İnvertör kütüphaneden seç. Özel invertör de ekleyebilirsin."
        >
          <div className="grid lg:grid-cols-[1fr_320px] gap-4">
            <LibraryList
              title="İnvertör Kütüphanesi"
              count={inverters.length}
              customCount={customInverters.length}
              onAdd={() => setAddingInverter(true)}
              addLabel="Yeni İnvertör"
            >
              {inverters.map((it, i) => (
                <InverterCard
                  key={i}
                  spec={it.spec}
                  isCustom={it.isCustom}
                  selected={i === selInverter}
                  onSelect={() => setSelInverter(i)}
                  onEdit={() => setEditInverterIdx(i)}
                  onDelete={it.isCustom && it.customIdx !== undefined ? () => removeCustomInverter(it.customIdx!) : undefined}
                />
              ))}
            </LibraryList>

            {inv && <SelectedInverterCard spec={inv} onEdit={() => setEditInverterIdx(selInverter)} />}
          </div>
        </SubCard>

        {/* ============================================================
            CARD 4/7 — Hedef Kurulu Güç (kWp + kWe + Otomatik Boyutlandır)
           ============================================================ */}
        <SubCard
          step="4 / 7"
          eyebrow="Target Capacity"
          title="Hedef Kurulu Güç"
          icon={Sigma}
          description="DC tarafı (kWp panel toplamı) ve AC tarafı (kWe invertör toplamı) hedeflerinizi belirleyin."
        >
          <div className="grid md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Hedef kWp (DC)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="100"
                  value={peakPowerKwp}
                  onChange={(e) => onPeakPowerChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 h-10 rounded-md border border-border bg-card text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="text-sm font-semibold text-muted-foreground">kWp</span>
              </div>
              {peakPowerKwp >= 1000 && (
                <div className="text-[10px] text-muted-foreground font-mono mt-1">
                  = {(peakPowerKwp / 1000).toFixed(2)} MWp
                </div>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Hedef kWe (AC)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="100"
                  value={targetKwe}
                  onChange={(e) => setTargetKwe(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 h-10 rounded-md border border-border bg-card text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="text-sm font-semibold text-muted-foreground">kWac</span>
              </div>
              {targetKwe > 0 && (
                <div className="text-[10px] text-muted-foreground font-mono mt-1">
                  DC/AC oranı: {peakPowerKwp > 0 && targetKwe > 0 ? (peakPowerKwp / targetKwe).toFixed(2) : '—'}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={applyAutoSize}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              <Wand2 className="h-4 w-4" />
              Otomatik Boyutlandır
            </button>
          </div>

          <div className="mt-3 text-[11px] text-muted-foreground">
            <strong>Tipik DC/AC aralığı:</strong> 1.15-1.30 optimal · 1.30-1.40 arazi GES için OK ·
            1.40+ sık clipping. Otomatik boyutlandırma 1.22 hedefler.
          </div>
        </SubCard>

        {/* ============================================================
            CARD 5/7 — Otomatik String Sizing (Öneri)
           ============================================================ */}
        {autoSizing && mod && inv && (
          <SubCard
            step="5 / 7"
            eyebrow="Auto String Sizing (Recommendation)"
            title="Otomatik String Sizing — Öneri"
            icon={Layers}
            description="Sistemin önerdiği boyutlandırma — sıcaklık, MPPT eşikleri ve invertör DC kapasitesine göre."
          >
            {/* Sıcaklık aralığı */}
            <div className="grid grid-cols-2 gap-3 max-w-sm mb-4">
              <NumField label="Min Sıcaklık (°C)" hint="Voc Tmin için" value={tMin} onChange={setTMin} step={1} />
              <NumField label="Max Sıcaklık (°C)" hint="Vmp Tmax için" value={tMax} onChange={setTMax} step={1} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ResultTile label="Voc @ Tmin" value={`${autoSizing.vocTmin.toFixed(1)} V`} sub={`${tMin}°C'de Voc artar`} />
              <ResultTile label="Vmp @ Tmax" value={`${autoSizing.vmpTmax.toFixed(1)} V`} sub={`${tMax}°C'de Vmp düşer`} />
              <ResultTile label="Max Panel/String" value={String(autoSizing.maxPanelsPerString)} sub={`Voc × N < ${inv.maxInputVdc}V`} />
              <ResultTile label="Min Panel/String" value={String(autoSizing.minPanelsPerString)} sub={`Vmp × N > ${autoSizing.mpptVMin}V`} />
              <ResultTile label="Önerilen Panel/String" value={String(autoSizing.recommendedPanels)} sub="92% headroom" highlight />
              <ResultTile label="Önerilen Toplam Modül" value={autoSizing.totalModules.toLocaleString('tr-TR')} sub={`${mod.wp}Wp × ${autoSizing.totalModules}`} />
              <ResultTile label="Önerilen Toplam String" value={autoSizing.totalStrings.toLocaleString('tr-TR')} sub={`max ${autoSizing.maxStringsPerInverter}/inv`} />
              <ResultTile label="Önerilen Toplam İnvertör" value={autoSizing.totalInverters.toLocaleString('tr-TR')} sub={`${inv.acKw} kWac × ${autoSizing.totalInverters}`} highlight />
            </div>

            <div className="mt-3 text-[11px] text-muted-foreground italic">
              💡 Bu bir <strong>öneri</strong>. Aşağıdaki Kullanıcı Konfigürasyonu kartından isterseniz değiştirebilirsiniz.
            </div>
          </SubCard>
        )}

        {/* ============================================================
            CARD 6/7 — Kullanıcı Konfigürasyonu (Override + Validation)
           ============================================================ */}
        {autoSizing && userConfig && mod && inv && (
          <SubCard
            step="6 / 7"
            eyebrow="User Configuration (Final Design)"
            title="Kullanıcı Konfigürasyonu"
            icon={Settings}
            description="Sistemin önerisini kabul edin veya kendi değerlerinizi girin. Limit aşımı uyarı verir."
            verdict={userConfig.hasError ? 'error' : userConfig.hasWarn ? 'warn' : 'ok'}
          >
            {/* Mod seçimi (bulk vs per-inverter) */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                type="button"
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground"
              >
                Tüm İnvertörlere Toplu Uygula
              </button>
              <button
                type="button"
                disabled
                title="Yakında — invertör başına bağımsız konfigürasyon"
                className="px-3 py-1.5 rounded-md text-xs font-semibold border border-border bg-card text-muted-foreground cursor-not-allowed opacity-60"
              >
                Tek Tek Yapılandır <span className="text-[10px]">(yakında)</span>
              </button>
              <button
                type="button"
                onClick={applyAutoSize}
                className="ml-auto px-3 py-1.5 rounded-md text-xs font-semibold border border-border bg-card hover:bg-secondary inline-flex items-center gap-1"
              >
                <Wand2 className="h-3 w-3" /> Önerileri Geri Yükle
              </button>
            </div>

            {/* Input grid */}
            <div className="grid md:grid-cols-2 gap-3 mb-4">
              <OverrideField
                label="Panel / String"
                value={userConfig.panelsPerString}
                onChange={(v) => setUserPanelsPerString(v)}
                isCustom={userPanelsPerString !== null}
                onReset={() => setUserPanelsPerString(null)}
                hint={`Öneri: ${autoSizing.recommendedPanels} · Aralık: ${autoSizing.minPanelsPerString}-${autoSizing.maxPanelsPerString}`}
                error={userConfig.issues.some((i) => i.field === 'panels' && i.level === 'error')}
                warn={userConfig.issues.some((i) => i.field === 'panels' && i.level === 'warn')}
              />
              <OverrideField
                label="İnvertör Sayısı"
                value={userConfig.inverterCount}
                onChange={(v) => setUserInverterCount(v)}
                isCustom={userInverterCount !== null}
                onReset={() => setUserInverterCount(null)}
                hint={`Öneri: ${autoSizing.totalInverters} · Min: ${Math.ceil(userConfig.stringsTotal / autoSizing.maxStringsPerInverter)}`}
                error={userConfig.issues.some((i) => i.field === 'inverter' && i.level === 'error')}
                warn={userConfig.issues.some((i) => i.field === 'inverter' && i.level === 'warn')}
              />
            </div>

            {/* Sonuç özet */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <ResultTile label="Toplam Modül" value={autoSizing.totalModules.toLocaleString('tr-TR')} sub={`${mod.wp}Wp her biri`} />
              <ResultTile label="Toplam String" value={userConfig.stringsTotal.toLocaleString('tr-TR')} sub={`${userConfig.stringsPerInverter} string/inv`} />
              <ResultTile
                label="DC Kapasite (Gerçek)"
                value={`${userConfig.actualDcKw.toFixed(0)} kW`}
                sub={`Hedef: ${peakPowerKwp.toLocaleString('tr-TR')} kWp`}
              />
              <ResultTile
                label="AC Kapasite (Gerçek)"
                value={`${userConfig.totalAcKw.toLocaleString('tr-TR')} kW`}
                sub={`Hedef: ${targetKwe.toLocaleString('tr-TR')} kWac`}
              />
              <ResultTile
                label="DC/AC Oranı"
                value={userConfig.dcAcRatio.toFixed(2)}
                sub={
                  userConfig.dcAcRatio > 1.4 ? 'Yüksek clipping' :
                  userConfig.dcAcRatio >= 1.15 ? 'Optimal' :
                  'Düşük (atıl)'
                }
                highlight={userConfig.dcAcRatio >= 1.15 && userConfig.dcAcRatio <= 1.30}
                warning={userConfig.dcAcRatio > 1.4 || userConfig.dcAcRatio < 1.0}
              />
              <ResultTile
                label="String Voc (cold)"
                value={`${userConfig.stringVocCold.toFixed(0)} V`}
                sub={`Inv max ${inv.maxInputVdc}V`}
                warning={userConfig.stringVocCold > inv.maxInputVdc}
              />
              <ResultTile
                label="String Vmp (hot)"
                value={`${userConfig.stringVmpHot.toFixed(0)} V`}
                sub="MPPT min 200V"
                warning={userConfig.stringVmpHot < 200}
              />
              <ResultTile
                label="String/İnvertör"
                value={String(userConfig.stringsPerInverter)}
                sub={`Max ${autoSizing.maxStringsPerInverter}`}
                warning={userConfig.stringsPerInverter > autoSizing.maxStringsPerInverter}
              />
            </div>

            {/* Issues (uyarı/hata listesi) */}
            {userConfig.issues.length > 0 && (
              <div className="space-y-1.5 mt-3">
                {userConfig.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 px-3 py-2 rounded-md text-xs border ${
                      issue.level === 'error'
                        ? 'bg-red-50 border-red-300 text-red-900'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}
                  >
                    {issue.level === 'error'
                      ? <X className="h-3.5 w-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                      : <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />}
                    <span>{issue.msg}</span>
                  </div>
                ))}
              </div>
            )}

            {userConfig.issues.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md text-xs bg-eco/5 border border-eco/30 text-eco-dark">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-semibold">Tüm sınırlar içinde — bu konfigürasyon uygun.</span>
              </div>
            )}
          </SubCard>
        )}
      </div>

      {/* Modals */}
      {editModuleIdx !== null && modules[editModuleIdx] && (
        <ModuleEditor
          initial={modules[editModuleIdx].spec}
          isCustom={modules[editModuleIdx].isCustom}
          onSave={(spec) => handleSaveModule(spec, editModuleIdx)}
          onClose={() => setEditModuleIdx(null)}
        />
      )}
      {addingModule && (
        <ModuleEditor
          initial={DEFAULT_NEW_MODULE}
          isCustom={true}
          isNew
          onSave={(spec) => handleAddNewModule(spec)}
          onClose={() => setAddingModule(false)}
        />
      )}
      {editInverterIdx !== null && inverters[editInverterIdx] && (
        <InverterEditor
          initial={inverters[editInverterIdx].spec}
          isCustom={inverters[editInverterIdx].isCustom}
          onSave={(spec) => handleSaveInverter(spec, editInverterIdx)}
          onClose={() => setEditInverterIdx(null)}
        />
      )}
      {addingInverter && (
        <InverterEditor
          initial={DEFAULT_NEW_INVERTER}
          isCustom={true}
          isNew
          onSave={(spec) => handleAddNewInverter(spec)}
          onClose={() => setAddingInverter(false)}
        />
      )}
    </>
  );
}

// ============================================================
// SUB-CARD (PVsyst-style numbered card)
// ============================================================
function SubCard({
  step, eyebrow, title, icon: Icon, description, children, verdict,
}: {
  step: string; eyebrow: string; title: string; icon: typeof Cpu;
  description?: string; children: React.ReactNode;
  verdict?: 'ok' | 'warn' | 'error';
}) {
  const borderClass =
    verdict === 'error' ? 'border-red-300 shadow-sm shadow-red-100' :
    verdict === 'warn' ? 'border-amber-300 shadow-sm shadow-amber-100' :
    'border-border';
  return (
    <div className={`rounded-md border bg-card ${borderClass}`}>
      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary flex-shrink-0">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[1.4px] font-bold text-muted-foreground">
              <span className="font-mono">{step}</span>
              <span>·</span>
              <span>{eyebrow}</span>
            </div>
            <h3 className="text-sm font-bold text-foreground mt-0.5">{title}</h3>
            {description && <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">{description}</p>}
          </div>
        </div>
        {verdict && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
            verdict === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
            verdict === 'warn' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
            'bg-eco/10 text-eco-dark border border-eco/30'
          }`}>
            {verdict === 'error' ? <X className="h-2.5 w-2.5" /> :
             verdict === 'warn' ? <AlertTriangle className="h-2.5 w-2.5" /> :
             <CheckCircle2 className="h-2.5 w-2.5" />}
            {verdict === 'error' ? 'Hatalı' : verdict === 'warn' ? 'Uyarı' : 'Uygun'}
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ============================================================
// LIBRARY LIST (sol panel)
// ============================================================
function LibraryList({
  title, count, customCount, onAdd, addLabel, children,
}: { title: string; count: number; customCount: number; onAdd: () => void; addLabel: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-md bg-bg2/30 overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-secondary/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-foreground">{title}</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {count} ({customCount} özel)
          </span>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20"
        >
          <Plus className="h-3 w-3" />
          {addLabel}
        </button>
      </div>
      <div className="max-h-[320px] overflow-y-auto p-2 space-y-1.5">{children}</div>
    </div>
  );
}

// ============================================================
// SELECTED SPEC CARDS (sağ panel — full details)
// ============================================================
function SelectedModuleCard({ spec, onEdit }: { spec: ModuleSpec; onEdit: () => void }) {
  return (
    <div className="border-2 border-primary/30 rounded-md bg-primary/5 overflow-hidden h-fit sticky top-4">
      <div className="px-3 py-2 border-b border-primary/30 bg-primary/10 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[1.4px] font-bold text-primary">
          Seçili Modül
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
        >
          <Pencil className="h-3 w-3" /> Düzenle
        </button>
      </div>
      <div className="p-3 space-y-2.5 text-[12px]">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Marka / Model</div>
          <div className="font-bold text-foreground leading-tight">{spec.brand}</div>
          <div className="text-foreground/80">{spec.model}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-primary/20">
          <SpecRow label="Pmpp (Wp)" value={`${spec.wp}`} />
          <SpecRow label="Verim η" value={`${(spec.efficiency * 100).toFixed(1)}%`} />
          <SpecRow label="Vmp" value={`${spec.vmp.toFixed(1)} V`} />
          <SpecRow label="Imp" value={`${spec.imp.toFixed(2)} A`} />
          <SpecRow label="Voc" value={`${spec.voc.toFixed(1)} V`} />
          <SpecRow label="Isc" value={`${spec.isc.toFixed(2)} A`} />
          <SpecRow label="Temp Coeff" value={`${spec.tempCoeffPmaxPctPerC.toFixed(2)}%/°C`} />
          <SpecRow label="Bifacial" value={spec.bifacial ? '✓ Evet' : '— Hayır'} />
        </div>
      </div>
    </div>
  );
}

function SelectedInverterCard({ spec, onEdit }: { spec: InverterSpec; onEdit: () => void }) {
  return (
    <div className="border-2 border-primary/30 rounded-md bg-primary/5 overflow-hidden h-fit sticky top-4">
      <div className="px-3 py-2 border-b border-primary/30 bg-primary/10 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[1.4px] font-bold text-primary">
          Seçili İnvertör
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
        >
          <Pencil className="h-3 w-3" /> Düzenle
        </button>
      </div>
      <div className="p-3 space-y-2.5 text-[12px]">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Marka / Model</div>
          <div className="font-bold text-foreground leading-tight">{spec.brand}</div>
          <div className="text-foreground/80">{spec.model}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-primary/20">
          <SpecRow label="AC Power" value={`${spec.acKw} kW`} />
          <SpecRow label="Max DC" value={`${spec.maxDcKw} kW`} />
          <SpecRow label="Verim η (EU)" value={`${(spec.efficiencyEur * 100).toFixed(1)}%`} />
          <SpecRow label="Tip" value={spec.type === 'central' ? 'Central' : 'String'} />
          <SpecRow label="MPPT Sayısı" value={`${spec.mpptCount}`} />
          <SpecRow label="Max DC Volt" value={`${spec.maxInputVdc} V`} />
        </div>
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono font-semibold tabular-nums text-[12px] text-foreground">{value}</div>
    </div>
  );
}

// ============================================================
// MODULE CARD (kütüphane satırı)
// ============================================================
function ModuleCard({
  spec, isCustom, selected, onSelect, onEdit, onDelete,
}: {
  spec: ModuleSpec; isCustom: boolean; selected: boolean; onSelect: () => void; onEdit: () => void; onDelete?: () => void;
}) {
  return (
    <div
      className={`relative border rounded-md p-2.5 cursor-pointer transition-all group ${
        selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-foreground/30'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">{spec.brand}</span>
            {isCustom && <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Özel</span>}
            {spec.bifacial && <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Bifacial</span>}
          </div>
          <div className="text-[13px] font-semibold text-foreground leading-tight mt-0.5 truncate">{spec.model}</div>
          <div className="text-[10.5px] text-muted-foreground mt-1 font-mono tabular-nums">
            {spec.wp}Wp · {(spec.efficiency * 100).toFixed(1)}% η · Voc {spec.voc}V · Isc {spec.isc}A
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 rounded text-muted-foreground hover:bg-secondary hover:text-foreground" title="Düzenle">
            <Pencil className="h-3 w-3" />
          </button>
          {onDelete && (
            <button type="button" onClick={(e) => { e.stopPropagation(); if (confirm(`Silmek istediğinize emin misiniz?\n${spec.brand} ${spec.model}`)) onDelete(); }} className="p-1 rounded text-muted-foreground hover:bg-red-100 hover:text-red-600" title="Sil">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      {selected && <div className="absolute -left-px top-2 bottom-2 w-1 bg-primary rounded-r" />}
    </div>
  );
}

// ============================================================
// INVERTER CARD (kütüphane satırı)
// ============================================================
function InverterCard({
  spec, isCustom, selected, onSelect, onEdit, onDelete,
}: {
  spec: InverterSpec; isCustom: boolean; selected: boolean; onSelect: () => void; onEdit: () => void; onDelete?: () => void;
}) {
  return (
    <div
      className={`relative border rounded-md p-2.5 cursor-pointer transition-all ${
        selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-foreground/30'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">{spec.brand}</span>
            {isCustom && <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Özel</span>}
            <span className="text-[9px] font-bold uppercase tracking-wider bg-secondary text-foreground/70 px-1.5 py-0.5 rounded">
              {spec.type === 'central' ? 'Central' : 'String'}
            </span>
          </div>
          <div className="text-[13px] font-semibold text-foreground leading-tight mt-0.5 truncate">{spec.model}</div>
          <div className="text-[10.5px] text-muted-foreground mt-1 font-mono tabular-nums">
            {spec.acKw}kW AC · {spec.mpptCount} MPPT · {spec.maxInputVdc}Vdc · η {(spec.efficiencyEur * 100).toFixed(1)}%
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 rounded text-muted-foreground hover:bg-secondary hover:text-foreground" title="Düzenle">
            <Pencil className="h-3 w-3" />
          </button>
          {onDelete && (
            <button type="button" onClick={(e) => { e.stopPropagation(); if (confirm(`Silmek istediğinize emin misiniz?\n${spec.brand} ${spec.model}`)) onDelete(); }} className="p-1 rounded text-muted-foreground hover:bg-red-100 hover:text-red-600" title="Sil">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      {selected && <div className="absolute -left-px top-2 bottom-2 w-1 bg-primary rounded-r" />}
    </div>
  );
}

// ============================================================
// RESULT TILE
// ============================================================
function ResultTile({
  label, value, sub, highlight, warning,
}: { label: string; value: string; sub?: string; highlight?: boolean; warning?: boolean }) {
  const borderClass =
    warning ? 'border-red-300 bg-red-50/50' :
    highlight ? 'border-primary/40 bg-primary/5' :
    'border-border bg-card';
  const valColor = warning ? 'text-red-700' : highlight ? 'text-primary' : 'text-foreground';
  return (
    <div className={`rounded-md border p-2.5 ${borderClass}`}>
      <div className="text-[10px] uppercase tracking-[1.3px] font-bold text-muted-foreground leading-tight">{label}</div>
      <div className={`text-lg font-bold tabular-nums tracking-tight mt-1 leading-none ${valColor}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{sub}</div>}
    </div>
  );
}

// ============================================================
// OVERRIDE FIELD (Card 6 — user input with validation borders)
// ============================================================
function OverrideField({
  label, value, onChange, isCustom, onReset, hint, error, warn,
}: {
  label: string; value: number; onChange: (v: number) => void; isCustom: boolean;
  onReset: () => void; hint: string; error: boolean; warn: boolean;
}) {
  const borderClass =
    error ? 'border-red-500 ring-2 ring-red-200' :
    warn ? 'border-amber-500 ring-2 ring-amber-200' :
    'border-border';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
        {isCustom && (
          <button
            type="button"
            onClick={onReset}
            className="text-[10px] text-muted-foreground hover:text-foreground underline"
          >
            Öneriye dön
          </button>
        )}
      </div>
      <input
        type="number"
        step="1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`w-full px-3 h-10 rounded-md border bg-card text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40 ${borderClass}`}
      />
      <div className={`text-[10px] mt-1 ${error ? 'text-red-600 font-semibold' : warn ? 'text-amber-700' : 'text-muted-foreground'}`}>
        {hint}
      </div>
    </div>
  );
}

// ============================================================
// NUMBER FIELD
// ============================================================
function NumField({ label, hint, value, onChange, step }: { label: string; hint?: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-foreground mb-1">{label}</label>
      <input
        type="number"
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 h-9 rounded-md border border-border bg-card text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

// ============================================================
// MODAL SHELL + EDITORS (unchanged)
// ============================================================
const DEFAULT_NEW_MODULE: ModuleSpec = {
  brand: '', model: '', wp: 580, efficiency: 0.224, vmp: 43.5, imp: 13.34,
  voc: 51.7, isc: 14.04, tempCoeffPmaxPctPerC: -0.29, bifacial: true,
};
const DEFAULT_NEW_INVERTER: InverterSpec = {
  brand: '', model: '', acKw: 100, maxDcKw: 130, efficiencyEur: 0.985,
  mpptCount: 10, maxInputVdc: 1500, type: 'string',
};

function ModuleEditor({
  initial, isCustom, isNew, onSave, onClose,
}: { initial: ModuleSpec; isCustom: boolean; isNew?: boolean; onSave: (spec: ModuleSpec) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<ModuleSpec>(initial);
  const set = <K extends keyof ModuleSpec>(k: K, v: ModuleSpec[K]) => setDraft((d) => ({ ...d, [k]: v }));
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.brand.trim() || !draft.model.trim()) return;
    onSave(draft);
  }
  return (
    <ModalShell title={isNew ? 'Yeni Modül Ekle' : isCustom ? 'Modül Düzenle' : 'Modül Düzenle (kopya olarak kaydedilir)'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <ModalField label="Marka"><input type="text" value={draft.brand} onChange={(e) => set('brand', e.target.value)} required className="modal-input" /></ModalField>
          <ModalField label="Model"><input type="text" value={draft.model} onChange={(e) => set('model', e.target.value)} required className="modal-input" /></ModalField>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ModalField label="Wp"><input type="number" step="5" value={draft.wp} onChange={(e) => set('wp', parseFloat(e.target.value) || 0)} className="modal-input" /></ModalField>
          <ModalField label="η (0..1)"><input type="number" step="0.001" value={draft.efficiency} onChange={(e) => set('efficiency', parseFloat(e.target.value) || 0)} className="modal-input" /></ModalField>
          <ModalField label="Temp Coeff (%/°C)"><input type="number" step="0.01" value={draft.tempCoeffPmaxPctPerC} onChange={(e) => set('tempCoeffPmaxPctPerC', parseFloat(e.target.value) || 0)} className="modal-input" /></ModalField>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <ModalField label="Vmp (V)"><input type="number" step="0.1" value={draft.vmp} onChange={(e) => set('vmp', parseFloat(e.target.value) || 0)} className="modal-input" /></ModalField>
          <ModalField label="Imp (A)"><input type="number" step="0.01" value={draft.imp} onChange={(e) => set('imp', parseFloat(e.target.value) || 0)} className="modal-input" /></ModalField>
          <ModalField label="Voc (V)"><input type="number" step="0.1" value={draft.voc} onChange={(e) => set('voc', parseFloat(e.target.value) || 0)} className="modal-input" /></ModalField>
          <ModalField label="Isc (A)"><input type="number" step="0.01" value={draft.isc} onChange={(e) => set('isc', parseFloat(e.target.value) || 0)} className="modal-input" /></ModalField>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.bifacial} onChange={(e) => set('bifacial', e.target.checked)} />
          Bifacial
        </label>
        <ModalFooter onClose={onClose} saveLabel={isNew ? 'Kütüphaneye Ekle' : 'Kaydet'} />
      </form>
    </ModalShell>
  );
}

function InverterEditor({
  initial, isCustom, isNew, onSave, onClose,
}: { initial: InverterSpec; isCustom: boolean; isNew?: boolean; onSave: (spec: InverterSpec) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<InverterSpec>(initial);
  const set = <K extends keyof InverterSpec>(k: K, v: InverterSpec[K]) => setDraft((d) => ({ ...d, [k]: v }));
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.brand.trim() || !draft.model.trim()) return;
    onSave(draft);
  }
  return (
    <ModalShell title={isNew ? 'Yeni İnvertör Ekle' : isCustom ? 'İnvertör Düzenle' : 'İnvertör Düzenle (kopya olarak kaydedilir)'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <ModalField label="Marka"><input type="text" value={draft.brand} onChange={(e) => set('brand', e.target.value)} required className="modal-input" /></ModalField>
          <ModalField label="Model"><input type="text" value={draft.model} onChange={(e) => set('model', e.target.value)} required className="modal-input" /></ModalField>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ModalField label="AC (kW)"><input type="number" step="1" value={draft.acKw} onChange={(e) => set('acKw', parseFloat(e.target.value) || 0)} className="modal-input" /></ModalField>
          <ModalField label="Max DC (kW)"><input type="number" step="1" value={draft.maxDcKw} onChange={(e) => set('maxDcKw', parseFloat(e.target.value) || 0)} className="modal-input" /></ModalField>
          <ModalField label="η EUR"><input type="number" step="0.001" value={draft.efficiencyEur} onChange={(e) => set('efficiencyEur', parseFloat(e.target.value) || 0)} className="modal-input" /></ModalField>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ModalField label="MPPT Sayısı"><input type="number" step="1" value={draft.mpptCount} onChange={(e) => set('mpptCount', parseFloat(e.target.value) || 0)} className="modal-input" /></ModalField>
          <ModalField label="Max DC Voltage (V)"><input type="number" step="50" value={draft.maxInputVdc} onChange={(e) => set('maxInputVdc', parseFloat(e.target.value) || 0)} className="modal-input" /></ModalField>
          <ModalField label="Tip">
            <select value={draft.type} onChange={(e) => set('type', e.target.value as 'string' | 'central')} className="modal-input">
              <option value="string">String</option>
              <option value="central">Central</option>
            </select>
          </ModalField>
        </div>
        <ModalFooter onClose={onClose} saveLabel={isNew ? 'Kütüphaneye Ekle' : 'Kaydet'} />
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <style jsx global>{`
        .modal-input {
          width: 100%; padding: 0.375rem 0.625rem; border-radius: 0.375rem;
          border: 1px solid hsl(var(--border)); background: hsl(var(--card));
          font-size: 13px; font-family: ui-monospace, SFMono-Regular, monospace;
        }
        .modal-input:focus { outline: none; box-shadow: 0 0 0 2px hsl(var(--primary) / 0.4); }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

function ModalFooter({ onClose, saveLabel }: { onClose: () => void; saveLabel: string }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-2">
      <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md border border-border bg-card text-xs font-semibold hover:bg-secondary">
        İptal
      </button>
      <button type="submit" className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:opacity-90">
        {saveLabel}
      </button>
    </div>
  );
}
