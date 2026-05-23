'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Panel azimut + eğim için PVSyst benzeri görsel.
 * - Pusula üzerinde panel yönelimi gösterir.
 * - Hızlı preset butonları: Güney/Doğu/Batı/Kuzey.
 * - Özel azimut için input.
 * - Yan görünüm: eğim açısı.
 */
export function PanelOrientation({
  angle,
  aspect,
  onAngleChange,
  onAspectChange,
}: {
  angle: number;
  aspect: number;
  onAngleChange: (v: number) => void;
  onAspectChange: (v: number) => void;
}) {
  const presets = [
    { label: 'Güney', value: 0 },
    { label: 'Güneydoğu', value: -45 },
    { label: 'Doğu', value: -90 },
    { label: 'Güneybatı', value: 45 },
    { label: 'Batı', value: 90 },
    { label: 'Kuzey', value: 180 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Pusula — azimut */}
      <div className="space-y-3">
        <Label>Azimut (Yön)</Label>
        <div className="flex flex-col items-center bg-secondary/40 rounded-xl p-4">
          <Compass aspect={aspect} />
          <div className="grid grid-cols-3 gap-1.5 mt-3 w-full">
            {presets.map((p) => (
              <Button
                key={p.value}
                type="button"
                size="sm"
                variant={aspect === p.value ? 'default' : 'outline'}
                onClick={() => onAspectChange(p.value)}
                className="text-xs"
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 w-full">
            <Label className="text-xs">Özel:</Label>
            <Input
              type="number"
              value={aspect}
              min={-180}
              max={180}
              step={5}
              onChange={(e) => onAspectChange(parseFloat(e.target.value))}
              className="h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">°</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 text-center">
            Güney=0°, Doğu=-90°, Batı=+90°, Kuzey=±180°
          </div>
        </div>
      </div>

      {/* Yan görünüm — eğim */}
      <div className="space-y-3">
        <Label>Panel Eğim Açısı</Label>
        <div className="flex flex-col items-center bg-secondary/40 rounded-xl p-4">
          <SideView angle={angle} />
          <div className="grid grid-cols-4 gap-1.5 mt-3 w-full">
            {[0, 15, 25, 35].map((a) => (
              <Button
                key={a}
                type="button"
                size="sm"
                variant={angle === a ? 'default' : 'outline'}
                onClick={() => onAngleChange(a)}
                className="text-xs"
              >
                {a}°
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 w-full">
            <Label className="text-xs">Özel:</Label>
            <Input
              type="number"
              value={angle}
              min={0}
              max={90}
              step={1}
              onChange={(e) => onAngleChange(parseFloat(e.target.value))}
              className="h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">°</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 text-center">
            Türkiye için optimum: 28-35°. Çatıda mevcut eğim önceliklidir.
          </div>
        </div>
      </div>
    </div>
  );
}

function Compass({ aspect }: { aspect: number }) {
  // Azimut → SVG açısı (Güney aşağıda yer alır pusulada genellikle, ama biz Kuzey üstte gösterelim)
  // Güney=0° (south) → ekrandaki "S" işareti, ok aşağı bakar
  // Aspect=-90 (Doğu) → ok sağa bakar
  // SVG rotation: aspect=0 → ok güneye (aşağı = 180° SVG); aspect=90 → batıya (sol = 270°)
  // panelOk yönü (SVG): 180 - aspect (saat yönüne çevir)
  const svgRotation = 180 - aspect;
  return (
    <svg viewBox="0 0 200 200" className="w-44 h-44">
      {/* Daire */}
      <circle cx="100" cy="100" r="85" fill="white" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Iç halkalar */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="100"
          y1="100"
          x2={100 + 80 * Math.sin((deg * Math.PI) / 180)}
          y2={100 - 80 * Math.cos((deg * Math.PI) / 180)}
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
        />
      ))}
      {/* Yön etiketleri */}
      <text x="100" y="22" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">K</text>
      <text x="178" y="105" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">D</text>
      <text x="100" y="190" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#f59e0b">G</text>
      <text x="22" y="105" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">B</text>
      {/* Panel yönü oku */}
      <g transform={`rotate(${svgRotation} 100 100)`}>
        <line x1="100" y1="100" x2="100" y2="35" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
        <polygon points="100,25 92,42 108,42" fill="#f59e0b" />
        <circle cx="100" cy="100" r="6" fill="#f59e0b" />
      </g>
      {/* Aspect değeri */}
      <text x="100" y="160" textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">
        Azimut: {aspect.toFixed(0)}°
      </text>
    </svg>
  );
}

function SideView({ angle }: { angle: number }) {
  // Yan görünüm: panel açısı görsel
  // Yatay zemin = 0, panel sol uç sabit (zeminde), sağ uç açıya göre yükselir
  const length = 120;
  const rad = (angle * Math.PI) / 180;
  const x2 = 40 + length * Math.cos(rad);
  const y2 = 140 - length * Math.sin(rad);
  return (
    <svg viewBox="0 0 200 200" className="w-44 h-44">
      {/* Güneş */}
      <circle cx="155" cy="40" r="14" fill="#fcd34d" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1={155 + 16 * Math.cos((deg * Math.PI) / 180)}
          y1={40 + 16 * Math.sin((deg * Math.PI) / 180)}
          x2={155 + 22 * Math.cos((deg * Math.PI) / 180)}
          y2={40 + 22 * Math.sin((deg * Math.PI) / 180)}
          stroke="#fcd34d"
          strokeWidth="2"
        />
      ))}
      {/* Zemin */}
      <line x1="20" y1="140" x2="180" y2="140" stroke="hsl(var(--border))" strokeWidth="2" />
      {[30, 50, 70, 90, 110, 130, 150, 170].map((x) => (
        <line key={x} x1={x} y1={140} x2={x - 5} y2={148} stroke="hsl(var(--border))" strokeWidth="0.8" />
      ))}
      {/* Panel */}
      <line x1={40} y1={140} x2={x2} y2={y2} stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
      {/* Açı arc */}
      <path
        d={`M ${40 + 30} ${140} A 30 30 0 0 0 ${40 + 30 * Math.cos(rad)} ${140 - 30 * Math.sin(rad)}`}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
      <text x={40 + 38} y={138 - 5} fontSize="11" fill="#b45309" fontWeight="bold">
        {angle.toFixed(0)}°
      </text>
    </svg>
  );
}
