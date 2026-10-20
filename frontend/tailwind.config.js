/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Preserved for backwards compatibility with existing UI components
        brand: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },

        // Primary: Design System Indigo / Blue Palette
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },

        // Semantic Feedback Palettes
        success: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        warning: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
        info: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },

        // Score Band Semantic Colors (Strict: low=red, mid=amber, high=green)
        score: {
          low: {
            DEFAULT: 'var(--score-low-base)',
            bg: 'var(--score-low-bg)',
            text: 'var(--score-low-text)',
            border: 'var(--score-low-border)',
          },
          mid: {
            DEFAULT: 'var(--score-mid-base)',
            bg: 'var(--score-mid-bg)',
            text: 'var(--score-mid-text)',
            border: 'var(--score-mid-border)',
          },
          high: {
            DEFAULT: 'var(--score-high-base)',
            bg: 'var(--score-high-bg)',
            text: 'var(--score-high-text)',
            border: 'var(--score-high-border)',
          },
        },

        // Semantic Theme-Adaptive Surface & Content Colors
        canvas: 'var(--bg-canvas)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
          sunken: 'var(--bg-surface-sunken)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },

      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.005em' }],
        base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0em' }],
        lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        display: ['3rem', { lineHeight: '1', letterSpacing: '-0.03em' }],
      },

      spacing: {
        '0.5': '0.125rem',
        '1.5': '0.375rem',
        '2.5': '0.625rem',
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
      },

      borderRadius: {
        none: '0px',
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1.0rem',
        full: '9999px',
      },

      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        inner: 'var(--shadow-inner)',
      },

      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        moderate: '250ms',
        slow: '300ms',
        150: '150ms',
        200: '200ms',
        250: '250ms',
        300: '300ms',
      },

      transitionTimingFunction: {
        'ease-out-custom': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-custom': 'cubic-bezier(0.7, 0, 0.84, 0)',
        'ease-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      keyframes: {
        pageEnter: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        modalCardIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        toastSlideIn: {
          '0%': { opacity: '0', transform: 'translateX(1rem) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
      },

      animation: {
        'page-enter': 'pageEnter 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'modal-in': 'modalCardIn 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast-in': 'toastSlideIn 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
