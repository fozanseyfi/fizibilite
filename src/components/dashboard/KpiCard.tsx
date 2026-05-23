import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function KpiCard({
  label,
  value,
  sub,
  accent = 'navy',
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'solar' | 'eco' | 'navy';
}) {
  const accentClass =
    accent === 'solar' ? 'border-l-solar' : accent === 'eco' ? 'border-l-eco' : 'border-l-navy';
  return (
    <Card className={cn('border-l-4', accentClass)}>
      <CardContent className="p-4">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{label}</div>
        <div className="text-xl font-bold text-foreground leading-tight whitespace-nowrap overflow-hidden text-ellipsis tabular-nums">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-1 whitespace-nowrap overflow-hidden text-ellipsis">{sub}</div>}
      </CardContent>
    </Card>
  );
}
