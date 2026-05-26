'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Cpu, Zap, Pencil, Plus, Check, X, AlertTriangle, CheckCircle2, Sigma, Trash2,
} from 'lucide-react';
import { MODULE_LIBRARY, INVERTER_LIBRARY, ModuleSpec, InverterSpec } from '@/lib/pv-losses';
import { useStore } from '@/lib/admin-store';

interface PvSystemSizerProps {
  peakPowerKwp: number;
  /** Eğer verilirse kWp inputu kütüphane header'ında görünür (PVsyst tarzı tek blok) */
  onPeakPowerChange?: (kwp: number) => void;
}

/**
 * PVsyst-tarzı modül + invertör seçimi ve string boyutlandırma.
 *
 * Akış:
 *   1. Soldan modül seç (built-in + custom). "Düzenle" ile spec popup, "Yeni" ile ekle.
 *   2. Sağdan invertör seç (built-in + custom). Aynı şekilde.
 *   3. Otomatik string sizing:
 *      - Voc(Tmin)  → Max paneller/string (inverter max Vdc'ye göre)
 *      - Vmp(Tmax)  → Min paneller/string (MPPT min Vdc'ye göre)
 *      - DC/AC oranı
 *      - Uyumluluk verdict (✓/⚠/✗)
 */
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

  // ---------- Seçim state ----------
  const [selModule, setSelModule] = useState(0);          // index in modules[]
  const [selInverter, setSelInverter] = useState(0);

  // ---------- Sıcaklık aralığı (string sizing için) ----------
  const [tMin, setTMin] = useState(-10);   // ° — soğuk gece (Voc artar)
  const [tMax, setTMax] = useState(70);    // ° — sıcak modül (Vmp düşer)

  // ---------- Modal state ----------
  const [editModuleIdx, setEditModuleIdx] = useState<number | null>(null);
  const [editInverterIdx, setEditInverterIdx] = useState<number | null>(null);
  const [addingModule, setAddingModule] = useState(false);
  const [addingInverter, setAddingInverter] = useState(false);

  // ---------- Combined libraries ----------
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

  // selected indexes safety
  useEffect(() => {
    if (selModule >= modules.length) setSelModule(0);
    if (selInverter >= inverters.length) setSelInverter(0);
  }, [modules.length, inverters.length, selModule, selInverter]);

  const mod = modules[selModule]?.spec;
  const inv = inverters[selInverter]?.spec;

  // ---------- String sizing math ----------
  const sizing = useMemo(() => {
    if (!mod || !inv) return null;
    const STC_TEMP = 25;
    const tempCoeff = mod.tempCoeffPmaxPctPerC / 100; // ör. -0.0034 (%/°C)

    // Voc(Tmin) = Voc × (1 + tempCoeff × (Tmin - 25)) — soğukta artar
    const vocTmin = mod.voc * (1 + tempCoeff * (tMin - STC_TEMP));
    // Vmp(Tmax) = Vmp × (1 + tempCoeff × (Tmax - 25)) — sıcakta düşer
    const vmpTmax = mod.vmp * (1 + tempCoeff * (tMax - STC_TEMP));

    // Max paneller/string: max DC voltage / Voc(Tmin)
    const maxPanelsPerString = Math.floor(inv.maxInputVdc / vocTmin);

    // Min paneller/string: MPPT min voltage / Vmp(Tmax)
    // Burada MPPT min voltajı invertör spec'ten gelmeli, ama veri yok — typical MPPT min ~ 200V
    const mpptVMin = 200;
    const minPanelsPerString = Math.ceil(mpptVMin / vmpTmax);

    // Önerilen paneller/string: orta nokta veya max yakını
    const recommendedPanels = Math.max(
      minPanelsPerString,
      Math.min(maxPanelsPerString, Math.floor(maxPanelsPerString * 0.92))
    );

    // Toplam panel sayısı (hedef kWp'ye göre)
    const totalModules = Math.round((peakPowerKwp * 1000) / mod.wp);
    const totalStrings = Math.max(1, Math.ceil(totalModules / recommendedPanels));

    // Stringler kaç invertöre dağılır (MPPT × stringsPerMppt)
    const maxStringsPerInverter = inv.mpptCount * 2; // her MPPT'ye 2 paralel string varsayımı
    const totalInverters = Math.max(1, Math.ceil(totalStrings / maxStringsPerInverter));

    // Gerçek DC kapasitesi
    const actualDcKw = (totalModules * mod.wp) / 1000;
    const totalAcKw = totalInverters * inv.acKw;
    const dcAcRatio = totalAcKw > 0 ? actualDcKw / totalAcKw : 0;

    // Single-string Voc/Vmp/Imp
    const stringVocCold = vocTmin * recommendedPanels;
    const stringVmpHot = vmpTmax * recommendedPanels;
    const stringImp = mod.imp;

    // Compatibility checks
    const checks = [
      {
        name: 'String Voc < Inverter Max DC',
        ok: stringVocCold < inv.maxInputVdc,
        detail: `${stringVocCold.toFixed(0)}V < ${inv.maxInputVdc}V`,
      },
      {
        name: 'String Vmp > MPPT Min (~200V)',
        ok: stringVmpHot > mpptVMin,
        detail: `${stringVmpHot.toFixed(0)}V > ${mpptVMin}V`,
      },
      {
        name: 'DC/AC oranı 1.10-1.40 aralığında',
        ok: dcAcRatio >= 1.1 && dcAcRatio <= 1.4,
        detail: `${dcAcRatio.toFixed(2)} (önerilen 1.15-1.30)`,
      },
      {
        name: 'String akımı < MPPT max (15A varsayım)',
        ok: stringImp < 15,
        detail: `${stringImp.toFixed(2)}A < 15A`,
      },
    ];
    const allOk = checks.every((c) => c.ok);
    const anyFail = checks.some((c) => !c.ok);

    return {
      vocTmin, vmpTmax,
      maxPanelsPerString, minPanelsPerString, recommendedPanels,
      totalModules, totalStrings, totalInverters, maxStringsPerInverter,
      actualDcKw, totalAcKw, dcAcRatio,
      stringVocCold, stringVmpHot, stringImp,
      checks, allOk, anyFail,
    };
  }, [mod, inv, peakPowerKwp, tMin, tMax]);

  // ---------- Modal helpers ----------
  function handleSaveModule(spec: ModuleSpec, idx: number | null) {
    if (idx !== null) {
      // Editing existing custom
      if (modules[idx].isCustom && modules[idx].customIdx !== undefined) {
        updateCustomModule(modules[idx].customIdx, spec);
      } else {
        // Editing built-in → add as new custom
        addCustomModule({ ...spec, model: spec.model + ' (özel)' });
      }
    }
    setEditModuleIdx(null);
  }

  function handleAddNewModule(spec: ModuleSpec) {
    addCustomModule(spec);
    setAddingModule(false);
    setSelModule(modules.length); // jump to new
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
      <div className="space-y-4">
        {/* ---------- Target capacity input (PVsyst tarzı header) ---------- */}
        {onPeakPowerChange && (
          <div className="border border-border rounded-md bg-secondary/30 px-4 py-3 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Sigma className="h-4 w-4 text-primary" />
              <div>
                <div className="text-[10px] uppercase tracking-[1.4px] font-bold text-muted-foreground">Hedef Kurulu Güç</div>
                <div className="text-[11px] text-muted-foreground">Toplam DC nominal kapasite</div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="number"
                step="100"
                value={peakPowerKwp}
                onChange={(e) => onPeakPowerChange(parseFloat(e.target.value) || 0)}
                className="w-32 px-3 h-10 rounded-md border border-border bg-card text-base font-bold tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="text-sm font-semibold text-muted-foreground">kWp</span>
              {peakPowerKwp >= 1000 && (
                <span className="text-[11px] text-muted-foreground font-mono tabular-nums ml-1">
                  ({(peakPowerKwp / 1000).toFixed(2)} MWp)
                </span>
              )}
            </div>
          </div>
        )}

        {/* ---------- Module + Inverter library cards ---------- */}
        <div className="grid lg:grid-cols-2 gap-4">
          <LibraryColumn
            title="Modül (PV Panel)"
            icon={Cpu}
            count={modules.length}
            customCount={customModules.length}
            onAdd={() => setAddingModule(true)}
            addLabel="Yeni Modül Ekle"
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
          </LibraryColumn>

          <LibraryColumn
            title="İnvertör"
            icon={Zap}
            count={inverters.length}
            customCount={customInverters.length}
            onAdd={() => setAddingInverter(true)}
            addLabel="Yeni İnvertör Ekle"
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
          </LibraryColumn>
        </div>

        {/* ---------- Sıcaklık aralığı (Voc/Vmp hesabı için) ---------- */}
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <NumField label="Min Sıcaklık (°C)" hint="Soğuk gece — Voc artar" value={tMin} onChange={setTMin} step={1} />
          <NumField label="Max Sıcaklık (°C)" hint="Sıcak modül — Vmp düşer" value={tMax} onChange={setTMax} step={1} />
        </div>

        {/* ---------- String sizing sonuç ---------- */}
        {sizing && mod && inv && (
          <div className="border border-border rounded-md bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sigma className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-[10px] uppercase tracking-[1.4px] font-bold text-muted-foreground">String Sizing</div>
                  <h3 className="text-sm font-semibold">{mod.brand} {mod.model} → {inv.brand} {inv.model}</h3>
                </div>
              </div>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                sizing.allOk ? 'bg-eco/10 text-eco-dark border border-eco/30' :
                sizing.anyFail ? 'bg-red-50 text-red-700 border border-red-300' :
                'bg-amber-50 text-amber-700 border border-amber-300'
              }`}>
                {sizing.allOk ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {sizing.allOk ? 'Uyumlu' : 'Uyarı'}
              </div>
            </div>

            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <ResultTile label="Voc @ Tmin" value={`${sizing.vocTmin.toFixed(1)} V`} sub={`${tMin}°C'de`} />
              <ResultTile label="Vmp @ Tmax" value={`${sizing.vmpTmax.toFixed(1)} V`} sub={`${tMax}°C'de`} />
              <ResultTile label="Max Panel/String" value={String(sizing.maxPanelsPerString)} sub={`Voc < ${inv.maxInputVdc}V`} />
              <ResultTile label="Min Panel/String" value={String(sizing.minPanelsPerString)} sub="Vmp > 200V MPPT" />
              <ResultTile label="Önerilen Panel/String" value={String(sizing.recommendedPanels)} sub="92% headroom" highlight />
              <ResultTile label="Toplam Modül" value={sizing.totalModules.toLocaleString('tr-TR')} sub={`${mod.wp}Wp × ${sizing.totalModules}`} />
              <ResultTile label="Toplam String" value={sizing.totalStrings.toLocaleString('tr-TR')} sub={`max ${sizing.maxStringsPerInverter}/inv`} />
              <ResultTile label="Toplam İnvertör" value={sizing.totalInverters.toLocaleString('tr-TR')} sub={`${inv.acKw}kW × ${sizing.totalInverters}`} />
              <ResultTile label="DC Kapasite" value={`${sizing.actualDcKw.toFixed(0)} kW`} sub={`hedef ${peakPowerKwp} kWp`} />
              <ResultTile label="AC Kapasite" value={`${sizing.totalAcKw.toFixed(0)} kW`} sub="invertör tarafı" />
              <ResultTile label="DC/AC Oranı" value={sizing.dcAcRatio.toFixed(2)} sub={
                sizing.dcAcRatio > 1.4 ? 'Yüksek clipping' :
                sizing.dcAcRatio >= 1.15 ? 'Optimal' :
                'Düşük'
              } highlight={sizing.dcAcRatio >= 1.15 && sizing.dcAcRatio <= 1.30} />
              <ResultTile label="String Voc (cold)" value={`${sizing.stringVocCold.toFixed(0)} V`} sub={`${sizing.recommendedPanels} × Voc(Tmin)`} />
            </div>

            {/* Compatibility checks */}
            <div className="px-4 pb-4 space-y-1.5">
              <div className="text-[10px] uppercase tracking-[1.4px] font-bold text-muted-foreground mb-1.5 mt-1">
                Uyumluluk Kontrolleri
              </div>
              {sizing.checks.map((c, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs border ${
                  c.ok ? 'bg-eco/5 border-eco/20 text-foreground' : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  {c.ok ? <Check className="h-3.5 w-3.5 text-eco-dark flex-shrink-0" /> : <X className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />}
                  <span className="flex-1 font-medium">{c.name}</span>
                  <span className="text-[11px] font-mono tabular-nums text-muted-foreground">{c.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---------- Modals ---------- */}
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
// LIBRARY COLUMN
// ============================================================
function LibraryColumn({
  title, icon: Icon, count, customCount, onAdd, addLabel, children,
}: {
  title: string; icon: typeof Cpu; count: number; customCount: number; onAdd: () => void; addLabel: string; children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-md bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {count} ({customCount} özel)
          </span>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors"
        >
          <Plus className="h-3 w-3" />
          {addLabel}
        </button>
      </div>
      <div className="max-h-[280px] overflow-y-auto p-2 space-y-1.5">
        {children}
      </div>
    </div>
  );
}

// ============================================================
// MODULE CARD
// ============================================================
function ModuleCard({
  spec, isCustom, selected, onSelect, onEdit, onDelete,
}: {
  spec: ModuleSpec; isCustom: boolean; selected: boolean; onSelect: () => void; onEdit: () => void; onDelete?: () => void;
}) {
  return (
    <div
      className={`relative border rounded-md p-2.5 cursor-pointer transition-all group ${
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-card hover:border-foreground/30'
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
          <div className="text-[13px] font-semibold text-foreground leading-tight mt-0.5 truncate">
            {spec.model}
          </div>
          <div className="text-[10.5px] text-muted-foreground mt-1 font-mono tabular-nums">
            {spec.wp}Wp · {(spec.efficiency * 100).toFixed(1)}% η · Voc {spec.voc}V · Isc {spec.isc}A
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Düzenle"
          >
            <Pencil className="h-3 w-3" />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (confirm(`Silmek istediğinize emin misiniz?\n${spec.brand} ${spec.model}`)) onDelete(); }}
              className="p-1 rounded text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-colors"
              title="Sil"
            >
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
// INVERTER CARD
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
          <div className="text-[13px] font-semibold text-foreground leading-tight mt-0.5 truncate">
            {spec.model}
          </div>
          <div className="text-[10.5px] text-muted-foreground mt-1 font-mono tabular-nums">
            {spec.acKw}kW AC · {spec.mpptCount} MPPT · {spec.maxInputVdc}Vdc · η {(spec.efficiencyEur * 100).toFixed(1)}%
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Düzenle"
          >
            <Pencil className="h-3 w-3" />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (confirm(`Silmek istediğinize emin misiniz?\n${spec.brand} ${spec.model}`)) onDelete(); }}
              className="p-1 rounded text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-colors"
              title="Sil"
            >
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
// RESULT TILE (sizing)
// ============================================================
function ResultTile({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-2.5 ${highlight ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
      <div className="text-[10px] uppercase tracking-[1.3px] font-bold text-muted-foreground leading-tight">{label}</div>
      <div className={`text-lg font-bold tabular-nums tracking-tight mt-1 leading-none ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{sub}</div>}
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
// MODULE EDITOR MODAL
// ============================================================
const DEFAULT_NEW_MODULE: ModuleSpec = {
  brand: '',
  model: '',
  wp: 580,
  efficiency: 0.224,
  vmp: 43.5,
  imp: 13.34,
  voc: 51.7,
  isc: 14.04,
  tempCoeffPmaxPctPerC: -0.29,
  bifacial: true,
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

// ============================================================
// INVERTER EDITOR MODAL
// ============================================================
const DEFAULT_NEW_INVERTER: InverterSpec = {
  brand: '',
  model: '',
  acKw: 100,
  maxDcKw: 130,
  efficiencyEur: 0.985,
  mpptCount: 10,
  maxInputVdc: 1500,
  type: 'string',
};

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

// ============================================================
// MODAL SHELL
// ============================================================
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
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <style jsx global>{`
        .modal-input {
          width: 100%;
          padding: 0.375rem 0.625rem;
          border-radius: 0.375rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          font-size: 13px;
          font-family: ui-monospace, SFMono-Regular, monospace;
        }
        .modal-input:focus {
          outline: none;
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.4);
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
      >
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
