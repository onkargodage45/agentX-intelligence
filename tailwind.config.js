/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#05070d',
          900: '#0a0e1a',
          800: '#0f1424',
          700: '#161c30',
          600: '#1e2640',
          500: '#2a3354',
        },
        signal: {
          cyan: '#22d3ee',
          blue: '#3b82f6',
          green: '#34d399',
          amber: '#fbbf24',
          red: '#f87171',
          violet: '#a78bfa',
        },
      },
      boxShadow: {
        glass: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 30px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(34,211,238,0.25), 0 0 24px -6px rgba(34,211,238,0.35)',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        spinSlow: {
          to: { transform: 'rotate(360deg)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scanLine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 1.6s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        spinSlow: 'spinSlow 2.4s linear infinite',
        fadeInUp: 'fadeInUp 0.4s ease-out both',
        scanLine: 'scanLine 2s linear infinite',
      },
    },
  },
  plugins: [],
};
