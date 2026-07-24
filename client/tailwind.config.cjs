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
    // Shared @hanzo/ui components (network switcher / wallet menu)
    './node_modules/@hanzo/ui/dist/network/**/*.{js,mjs}',
    './node_modules/@hanzo/ui/dist/wallet/**/*.{js,mjs}',
  ],
  // darkMode: 'class',
  darkMode: ['class'],
  theme: {
    fontFamily: {
      sans: ['Basel', 'ui-sans-serif', 'system-ui', 'sans-serif'],
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
        // Shared @hanzo/brand monochrome scale (from variables.css). Additive —
        // chat's own `gray`/`mono` ramp is untouched; new shared chrome can use
        // `hanzo-*` so the palette resolves to the ONE brand source of truth.
        hanzo: {
          black: 'var(--hanzo-black)',
          white: 'var(--hanzo-white)',
          50: 'var(--hanzo-mono-50)',
          100: 'var(--hanzo-mono-100)',
          200: 'var(--hanzo-mono-200)',
          300: 'var(--hanzo-mono-300)',
          400: 'var(--hanzo-mono-400)',
          500: 'var(--hanzo-mono-500)',
          600: 'var(--hanzo-mono-600)',
          700: 'var(--hanzo-mono-700)',
          800: 'var(--hanzo-mono-800)',
          900: 'var(--hanzo-mono-900)',
          950: 'var(--hanzo-mono-950)',
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
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ['switch-unchecked']: 'hsl(var(--switch-unchecked))',
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
        popover: {
          DEFAULT: 'hsl(var(--popover, var(--background)))',
          foreground: 'hsl(var(--popover-foreground, var(--foreground)))',
        },
        destructive: {
          DEFAULT: 'var(--text-destructive)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
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
