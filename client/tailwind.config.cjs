// const { fontFamily } = require('tailwindcss/defaultTheme');

// Hanzo monochrome brand — every accent scale collapses to ONE neutral grey ramp.
// Black / white / grey only; no color in the UI chrome. Destructive semantics keep a
// single muted red via the --surface-destructive / --text-destructive CSS vars (style.css).
const mono = {
  50: '#f7f7f8',
  100: '#ececec',
  200: '#e3e3e3',
  300: '#cdcdcd',
  400: '#999696',
  500: '#595959',
  550: '#4d4d4d',
  600: '#424242',
  700: '#2f2f2f',
  800: '#212121',
  900: '#0d0d0d',
  // True-black token scale: #0a0a0a collapsed to #050505 so every `*-950`
  // utility (bg-gray-950 / bg-green-950 success panels, etc.) matches the
  // elevated-surface value instead of reading as a lighter grey.
  950: '#050505',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    // Include component library files
    '../packages/client/src/**/*.{js,jsx,ts,tsx}',
    // NOTE: @hanzogui/shell is deliberately NOT scanned. Under 7.x the shell
    // painted itself with utility class names, so a host that did not scan it
    // rendered it transparent — hence the glob that used to sit here. Under
    // 8.0.6 the five components chat imports (HanzoHeader, HanzoFooter,
    // HanzoPreFooterCTA, HanzoAppLauncher, HanzoMark) are 100% inline-styled
    // (theme.ts tokens + useShellStyles) and the whole dist contains ZERO
    // hardcoded className strings; verified against the installed package,
    // not the changelog. The only Tailwind-bearing components left in
    // the shell are the Tenant* authenticated chrome (TenantHeader, TenantMark,
    // TenantCommandPalette, UserOrgDropdown, AppSwitcher), which chat does not
    // import and which HanzoHeader does not pull in transitively. Scanning them
    // only emitted 33 rules for classes nothing here renders. If chat ever
    // adopts TenantHeader, this glob comes back.
  ],
  // darkMode: 'class',
  darkMode: ['class'],
  theme: {
    fontFamily: {
      sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['Geist Mono', 'ui-monospace', 'monospace'],
    },
    // fontFamily: {
    //   sans: ['Söhne', 'sans-serif'],
    //   mono: ['Söhne Mono', 'monospace'],
    // },
    extend: {
      width: {
        authPageWidth: '370px',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-out-left': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'slide-in-right': 'slide-in-right 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
        'slide-in-left': 'slide-in-left 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
        'slide-out-left': 'slide-out-left 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
        'slide-out-right': 'slide-out-right 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      colors: {
        gray: {
          20: '#ececf1',
          50: '#f7f7f8',
          100: '#ececec',
          200: '#e3e3e3',
          300: '#cdcdcd',
          400: '#999696',
          500: '#595959',
          600: '#424242',
          700: '#2f2f2f',
          800: '#212121',
          850: '#171717',
          900: '#0d0d0d',
        },
        // The shared monochrome ladder, now @hanzo/design's --neutral-*. It was
        // @hanzo/brand's --hanzo-mono-*: the same eleven values under a second
        // name, so this is a rename, not a repaint. Additive — chat's own
        // `gray`/`mono` ramp is untouched; new shared chrome uses `hanzo-*`.
        hanzo: {
          black: 'var(--hanzo-black)',
          white: 'var(--hanzo-white)',
          50: 'var(--neutral-50)',
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          300: 'var(--neutral-300)',
          400: 'var(--neutral-400)',
          500: 'var(--neutral-500)',
          600: 'var(--neutral-600)',
          700: 'var(--neutral-700)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
          950: 'var(--neutral-950)',
        },
        green: mono,
        red: mono,
        blue: mono,
        sky: mono,
        cyan: mono,
        teal: mono,
        emerald: mono,
        lime: mono,
        yellow: mono,
        amber: mono,
        orange: mono,
        indigo: mono,
        violet: mono,
        purple: mono,
        fuchsia: mono,
        pink: mono,
        rose: mono,
        'brand-purple': 'var(--brand-purple)',
        presentation: 'var(--presentation)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-secondary-alt': 'var(--text-secondary-alt)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-warning': 'var(--text-warning)',
        'text-destructive': 'var(--text-destructive)',
        'ring-primary': 'var(--ring-primary)',
        'header-primary': 'var(--header-primary)',
        'header-hover': 'var(--header-hover)',
        'header-button-hover': 'var(--header-button-hover)',
        'surface-active': 'var(--surface-active)',
        'surface-active-alt': 'var(--surface-active-alt)',
        'surface-hover': 'var(--surface-hover)',
        'surface-hover-alt': 'var(--surface-hover-alt)',
        'surface-primary': 'var(--surface-primary)',
        'surface-primary-alt': 'var(--surface-primary-alt)',
        'surface-primary-contrast': 'var(--surface-primary-contrast)',
        'surface-secondary': 'var(--surface-secondary)',
        'surface-secondary-alt': 'var(--surface-secondary-alt)',
        'surface-tertiary': 'var(--surface-tertiary)',
        'surface-tertiary-alt': 'var(--surface-tertiary-alt)',
        'surface-dialog': 'var(--surface-dialog)',
        'surface-submit': 'var(--surface-submit)',
        'surface-submit-hover': 'var(--surface-submit-hover)',
        'surface-destructive': 'var(--surface-destructive)',
        'surface-destructive-hover': 'var(--surface-destructive-hover)',
        'surface-chat': 'var(--surface-chat)',
        'border-light': 'var(--border-light)',
        'border-medium': 'var(--border-medium)',
        'border-medium-alt': 'var(--border-medium-alt)',
        'border-heavy': 'var(--border-heavy)',
        'border-xheavy': 'var(--border-xheavy)',
        'border-destructive': 'var(--border-destructive)',
        /* These are test styles */
        border: 'var(--border)',
        input: 'var(--input)',
        ['switch-unchecked']: 'var(--switch-unchecked)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
          /* `bg-primary/90` generates NO rule — Tailwind cannot alpha a var()
             color — so hover states written that way silently did nothing.
             This is the same 90% mix `.btn-primary:hover` uses (style.css). */
          hover: 'color-mix(in srgb, var(--primary) 90%, transparent)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        /* One `destructive`, not two. The key was declared twice in this object;
           the later literal won, so `--destructive` was unreachable and
           `text-destructive-foreground` — used in four places — was a class with
           no rule, which paints nothing and reports nothing. */
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover, var(--background))',
          foreground: 'var(--popover-foreground, var(--foreground))',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('tailwindcss-radix'),
    // require('@tailwindcss/typography'),
  ],
};
