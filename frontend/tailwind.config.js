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
          DEFAULT: '#6366f1', // indigo-500
          light: '#a5b4fc', // indigo-300
          dark: '#4f46e5', // indigo-600
        },
        secondary: {
          DEFAULT: '#8b5cf6', // violet-500
          light: '#c4b5fd', // violet-300
          dark: '#7c3aed', // violet-600
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
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
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
      },
      keyframes: {
        fade: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#1E293B', // Matches light.text
            h1: { fontWeight: '700' },
            h2: { fontWeight: '600' },
            a: {
              color: '#6366f1',
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
              color: '#a5b4fc',
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
