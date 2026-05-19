import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        keel: {
          50:  '#f0f7ff',
          100: '#daeeff',
          200: '#b3d9ff',
          300: '#7dbfff',
          400: '#3a99ff',
          500: '#0057b8',
          600: '#0047a0',
          700: '#003888',
          800: '#002b6e',
          900: '#00234a',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
