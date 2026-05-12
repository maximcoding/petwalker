import type { Config } from 'tailwindcss';

/**
 * Tailwind theme = thin mapping over CSS variables defined in
 * `src/app/globals.css`. Components reference Tailwind utilities
 * (e.g. `bg-coral-500`, `text-ink-primary`); raw hex/px values
 * are forbidden in components — extend tokens instead.
 *
 * Light mode only — `darkMode: 'class'` here means `dark:` utilities
 * only fire when `.dark` is on `<html>`, which dogwalk never sets.
 * (See .claude/skills/dogwalk-design — direction locked.)
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* === Hue families (50..900) === */
        brand: {
          50: 'var(--color-brand-50)',
          100: 'var(--color-brand-100)',
          200: 'var(--color-brand-200)',
          300: 'var(--color-brand-300)',
          400: 'var(--color-brand-400)',
          500: 'var(--color-brand-500)',
          600: 'var(--color-brand-600)',
          700: 'var(--color-brand-700)',
          800: 'var(--color-brand-800)',
          900: 'var(--color-brand-900)',
        },
        coral: {
          50: 'var(--color-coral-50)',
          100: 'var(--color-coral-100)',
          200: 'var(--color-coral-200)',
          300: 'var(--color-coral-300)',
          400: 'var(--color-coral-400)',
          500: 'var(--color-coral-500)',
          600: 'var(--color-coral-600)',
          700: 'var(--color-coral-700)',
          800: 'var(--color-coral-800)',
          900: 'var(--color-coral-900)',
        },
        sunshine: {
          50: 'var(--color-sunshine-50)',
          100: 'var(--color-sunshine-100)',
          200: 'var(--color-sunshine-200)',
          300: 'var(--color-sunshine-300)',
          400: 'var(--color-sunshine-400)',
          500: 'var(--color-sunshine-500)',
          600: 'var(--color-sunshine-600)',
          700: 'var(--color-sunshine-700)',
          800: 'var(--color-sunshine-800)',
          900: 'var(--color-sunshine-900)',
        },
        mint: {
          50: 'var(--color-mint-50)',
          100: 'var(--color-mint-100)',
          200: 'var(--color-mint-200)',
          300: 'var(--color-mint-300)',
          400: 'var(--color-mint-400)',
          500: 'var(--color-mint-500)',
          600: 'var(--color-mint-600)',
          700: 'var(--color-mint-700)',
          800: 'var(--color-mint-800)',
          900: 'var(--color-mint-900)',
        },
        sky: {
          50: 'var(--color-sky-50)',
          100: 'var(--color-sky-100)',
          200: 'var(--color-sky-200)',
          300: 'var(--color-sky-300)',
          400: 'var(--color-sky-400)',
          500: 'var(--color-sky-500)',
          600: 'var(--color-sky-600)',
          700: 'var(--color-sky-700)',
          800: 'var(--color-sky-800)',
          900: 'var(--color-sky-900)',
        },
        lavender: {
          50: 'var(--color-lavender-50)',
          100: 'var(--color-lavender-100)',
          200: 'var(--color-lavender-200)',
          300: 'var(--color-lavender-300)',
          400: 'var(--color-lavender-400)',
          500: 'var(--color-lavender-500)',
          600: 'var(--color-lavender-600)',
          700: 'var(--color-lavender-700)',
          800: 'var(--color-lavender-800)',
          900: 'var(--color-lavender-900)',
        },
        peach: {
          50: 'var(--color-peach-50)',
          100: 'var(--color-peach-100)',
          200: 'var(--color-peach-200)',
          300: 'var(--color-peach-300)',
          400: 'var(--color-peach-400)',
          500: 'var(--color-peach-500)',
          600: 'var(--color-peach-600)',
          700: 'var(--color-peach-700)',
          800: 'var(--color-peach-800)',
          900: 'var(--color-peach-900)',
        },
        warm: {
          50: 'var(--color-warm-50)',
          100: 'var(--color-warm-100)',
          200: 'var(--color-warm-200)',
          300: 'var(--color-warm-300)',
          400: 'var(--color-warm-400)',
          500: 'var(--color-warm-500)',
          600: 'var(--color-warm-600)',
          700: 'var(--color-warm-700)',
          800: 'var(--color-warm-800)',
          900: 'var(--color-warm-900)',
        },
        surface: {
          base: 'var(--surface-base)',
          raised: 'var(--surface-raised)',
          sunken: 'var(--surface-sunken)',
          overlay: 'var(--surface-overlay)',
          inverse: 'var(--surface-inverse)',
        },
        ink: {
          primary: 'var(--ink-primary)',
          secondary: 'var(--ink-secondary)',
          tertiary: 'var(--ink-tertiary)',
          disabled: 'var(--ink-disabled)',
          inverse: 'var(--ink-inverse)',
          link: 'var(--ink-link)',
          'link-hover': 'var(--ink-link-hover)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
        },
        status: {
          success: 'var(--status-success)',
          warning: 'var(--status-warning)',
          danger: 'var(--status-danger)',
          info: 'var(--status-info)',
          pending: 'var(--status-pending)',
          confirmed: 'var(--status-confirmed)',
          'in-progress': 'var(--status-in-progress)',
          completed: 'var(--status-completed)',
          cancelled: 'var(--status-cancelled)',
          'in-dispute': 'var(--status-in-dispute)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        pill: 'var(--radius-pill)',
        full: '9999px',
      },
      boxShadow: {
        subtle: 'var(--shadow-subtle)',
        card: 'var(--shadow-card)',
        overlay: 'var(--shadow-overlay)',
        focus: 'var(--shadow-focus)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        DEFAULT: 'var(--motion-base)',
        slow: 'var(--motion-slow)',
        spring: 'var(--motion-spring)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        spring: 'var(--ease-spring)',
      },
      zIndex: {
        base: 'var(--z-base)',
        elevated: 'var(--z-elevated)',
        sticky: 'var(--z-sticky)',
        dropdown: 'var(--z-dropdown)',
        drawer: 'var(--z-drawer)',
        modal: 'var(--z-modal)',
        toast: 'var(--z-toast)',
      },
      spacing: {
        touch: 'var(--size-touch)',
        'touch-lg': 'var(--size-touch-lg)',
      },
      minHeight: {
        touch: 'var(--size-touch)',
        'touch-lg': 'var(--size-touch-lg)',
      },
      minWidth: {
        touch: 'var(--size-touch)',
        'touch-lg': 'var(--size-touch-lg)',
      },
      backgroundImage: {
        'gradient-sunset': 'var(--gradient-sunset)',
        'gradient-meadow': 'var(--gradient-meadow)',
        'gradient-sky': 'var(--gradient-sky)',
        'gradient-warm': 'var(--gradient-warm)',
      },
    },
  },
  plugins: [],
};

export default config;
