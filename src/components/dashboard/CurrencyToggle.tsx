'use client';

import { Currency } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function CurrencyToggle({
  value,
  onChange,
  usdTry,
}: {
  value: Currency;
  onChange: (c: Currency) => void;
  usdTry: number;
}) {
  return (
    <div className="inline-flex items-center gap-2 bg-secondary rounded-md p-0.5 border border-border/40">
      <button
        type="button"
        onClick={() => onChange('USD')}
        className={cn(
          'px-3 py-1.5 text-xs font-bold rounded transition-colors',
          value === 'USD' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
        )}
        title="Banka/uluslararası yatırımcı görünümü (önerilen)"
      >
        $ USD
      </button>
      <button
        type="button"
        onClick={() => onChange('TL')}
        className={cn(
          'px-3 py-1.5 text-xs font-bold rounded transition-colors',
          value === 'TL' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
        )}
        title="Yerel sponsor görünümü"
      >
        ₺ TL
      </button>
      <span className="text-[10px] text-muted-foreground pr-2 pl-1 border-l border-border/40">
        {usdTry.toFixed(2)}
      </span>
    </div>
  );
}
