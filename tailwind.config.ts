import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Koyu sidebar — teklif platformundaki değerlerle BİREBİR aynı (platformlar arası bütünlük)
        sidebar: {
          DEFAULT: '#0f172a',
          foreground: '#cbd5e1',
          muted: '#94a3b8',
          border: '#1e293b',
          accent: '#047857',
          'accent-foreground': '#ecfdf5',
        },
        solar: {
          DEFAULT: '#f59e0b',
          light: '#fcd34d',
          dark: '#b45309',
        },
        eco: {
          DEFAULT: '#10b981',
          light: '#6ee7b7',
          dark: '#047857',
        },
        navy: {
          DEFAULT: 'rgb(var(--c-navy) / <alpha-value>)',
          light: '#1e293b',
        },
        // ---------- Admin/Yönetim sayfaları (emerald tema) ----------
        // Düz isimler (text2, bg2, accent2, blue2) — eski "shadcn" tema bozulmaz.
        // NOT: "accent" zaten shadcn block'unda HSL emerald-tone tanımlı; admin sayfaları da o değeri kullanır.
        accent2: '#047857',
        text: 'rgb(var(--c-text) / <alpha-value>)',    text2: 'rgb(var(--c-text2) / <alpha-value>)',   text3: 'rgb(var(--c-text3) / <alpha-value>)',
        bg: 'rgb(var(--c-bg) / <alpha-value>)',      bg2: 'rgb(var(--c-bg2) / <alpha-value>)',     bg3: 'rgb(var(--c-bg3) / <alpha-value>)',  bg4: 'rgb(var(--c-bg4) / <alpha-value>)',
        border2: 'rgb(var(--c-border2) / <alpha-value>)',
        blue: '#3b82f6',    blue2: '#2563eb',
        green: '#059669',
        red: '#ef4444',
        yellow: '#f59e0b',
        orange: '#475569',
        purple: '#8b5cf6',
        planned: '#3b82f6',
        realized: '#059669',
        critical: '#ef4444',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
