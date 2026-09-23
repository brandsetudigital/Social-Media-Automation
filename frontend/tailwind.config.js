/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: '#121212',
        primary: {
          DEFAULT: '#0172F4',
          hover: '#005cd3',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#0172F4',
          600: '#005cd3',
          700: '#1d4ed8',
        },
        'slate-dark': '#0F172A',
        'slate-sidebar': '#090D16',
        'neon-purple': '#8B5CF6',
        'neon-pink': '#EC4899',
        'royal-blue': '#0172F4',
        'emerald-accent': '#12B76A',
        'amber-alert': '#F79009',
        'social-orange': '#F97316',
        'text-offwhite': '#F8FAFC',
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0172F4',
          600: '#005cd3',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        slate: {
          850: '#151d2e',
          925: '#0b1120',
          950: '#060913',
        }
      },
      backgroundImage: {
        'gradient-vibrant': 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
        'gradient-social': 'linear-gradient(135deg, #F97316 0%, #EC4899 50%, #8B5CF6 100%)',
        'gradient-saas': 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
