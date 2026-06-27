import tailwindTypography from '@tailwindcss/typography';
export default {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
    './node_modules/@headlessui/react/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand colors (unchanged)
        primary: {
          DEFAULT: '#1565c0', // Material Blue-800
          light: '#90caf9', // Material Blue-200 / sky-300 equivalent
          dark: '#0d47a1', // Material Blue-900 / dark blue
        },
        secondary: {
          DEFAULT: '#0284c7', // Sky-600
          light: '#7dd3fc', // Sky-300
          dark: '#0369a1', // Sky-700
        },
        success: '#22c55e',
        warning: '#facc15',
        danger: '#ef4444',
        info: '#0ea5e9',

        light: {
          bg: '#F1F5F9',
          card: '#f5f5f5',
          text: '#1E293B',
          border: '#CBD5E1',
        },
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          text: '#e2e8f0',
          border: '#475569',
        },
      },

      fontFamily: {
        sans: ['var(--font-primary)', 'ui-sans-serif', 'system-ui'],
        secondary: ['var(--font-primary)', 'ui-sans-serif', 'system-ui'],
        tertiary: ['var(--font-primary)', 'ui-sans-serif', 'system-ui'],
        mono: ['Fira Code', 'ui-monospace', 'monospace'],
      },

      boxShadow: {
        card: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },

      transitionProperty: {
        width: 'width',
      },

      animation: {
        fade: 'fade 0.3s ease-in-out',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        'slide-in-up': 'slideInUp 1s ease-out forwards',
        shimmer: 'shimmer 8s ease-in-out infinite',
      },
      keyframes: {
        fade: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-16px) scale(1.02)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.06' },
          '50%': { opacity: '0.12' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%, 100%': { filter: 'blur(0px)', opacity: '0.15' },
          '33%': { filter: 'blur(1px)', opacity: '0.2' },
          '66%': { filter: 'blur(0px)', opacity: '0.12' },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#1E293B', // Matches light.text
            h1: { fontWeight: '700' },
            h2: { fontWeight: '600' },
            a: {
              color: '#1565c0',
              textDecoration: 'none',
              hover: { textDecoration: 'underline' },
            },
          },
        },
        dark: {
          css: {
            color: '#e2e8f0', // Matches dark.text
            h1: { fontWeight: '700' },
            h2: { fontWeight: '600' },
            a: {
              color: '#90caf9',
              textDecoration: 'none',
              hover: { textDecoration: 'underline' },
            },
          },
        },
      },
    },
  },
  plugins: [tailwindTypography],
};
