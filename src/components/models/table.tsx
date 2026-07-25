'use client';

import { Card } from '@/components/ui/card';

export function Section({ title, children, sub }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[13px] font-bold mb-2">{title}{sub && <span className="ml-2 font-normal text-muted-foreground text-[11px]">{sub}</span>}</h3>
      <Card className="p-4">{children}</Card>
    </div>
  );
}

export function DataTable({ head, rows, totalRow }: {
  head: string[]; rows: (string | number)[][]; totalRow?: (string | number)[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-[11.5px] font-mono whitespace-nowrap">
        <thead>
          <tr className="bg-secondary/50 text-primary">
            {head.map((h, i) => (
              <th key={i} className={`px-2.5 py-2 font-semibold ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-border/50">
              {r.map((c, ci) => <td key={ci} className={`px-2.5 py-1.5 ${ci === 0 ? 'text-left' : 'text-right'}`}>{c}</td>)}
            </tr>
          ))}
          {totalRow && (
            <tr className="border-t-2 border-amber-400/60 font-semibold" style={{ background: 'rgba(232,160,32,0.1)' }}>
              {totalRow.map((c, ci) => <td key={ci} className={`px-2.5 py-2 ${ci === 0 ? 'text-left' : 'text-right'}`}>{c}</td>)}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
