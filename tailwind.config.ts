import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Text on the pastel canvas, from headings down to quiet captions
        graphite: {
          // Headings and body copy read as black on the pale surfaces
          DEFAULT: '#08080d',
          soft: '#16161f',
          // Reserved for genuine metadata - handles, dates, counts
          mute: '#5b5d73',
        },
        // The canvas itself and the washes that drift across it
        pastel: {
          canvas: '#f0f5fd',
          periwinkle: '#c6d2ff',
          sky: '#b9dcff',
          mint: '#c2f0e4',
          blush: '#ffcfe4',
        },
        // The house blue the logo's spell-glow sits on
        azure: '#0071bc',
        'ycs-pink': '#90c8ff',
        'ycs-blue': '#0071BC',
        'ycs-green': '#39A393',
        'sparkle-gold': '#FFD700',
      },
      boxShadow: {
        // Soft, wide and low-contrast - light-theme cards lift with shadow
        // rather than with a lit edge
        card: '0 10px 30px -14px rgba(31,32,51,0.22)',
      },
      keyframes: {
        // Two slow, offset drifts keep the background alive without a loop
        // ever being obvious
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(4%, -3%, 0) scale(1.12)' },
        },
        'drift-slow': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1.05)' },
          '50%': { transform: 'translate3d(-5%, 4%, 0) scale(0.95)' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        sparkle: {
          '0%': {
            boxShadow: '0 0 20px 2px rgba(255, 215, 0, 0.8), inset 0 0 20px 2px rgba(255, 215, 0, 0.4)',
            '--tw-border-opacity': '0.8',
          },
          '25%': {
            boxShadow: '0 0 30px 4px rgba(255, 215, 0, 0.9), inset 0 0 15px 2px rgba(255, 215, 0, 0.5)',
          },
          '50%': {
            boxShadow: '0 0 20px 2px rgba(255, 215, 0, 0.7), inset 0 0 20px 2px rgba(255, 215, 0, 0.3)',
          },
          '75%': {
            boxShadow: '0 0 30px 4px rgba(255, 215, 0, 0.9), inset 0 0 15px 2px rgba(255, 215, 0, 0.5)',
          },
          '100%': {
            boxShadow: '0 0 20px 2px rgba(255, 215, 0, 0.8), inset 0 0 20px 2px rgba(255, 215, 0, 0.4)',
          },
        },
      },
      animation: {
        sparkle: 'sparkle 2.5s ease-in-out infinite',
        drift: 'drift 26s ease-in-out infinite',
        'drift-slow': 'drift-slow 34s ease-in-out infinite',
        rise: 'rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
export default config;