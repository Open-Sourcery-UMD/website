import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      typography: ({ theme }: { theme: (path: string) => string }) => ({
        invert: {
          css: {
            color: theme('colors.white'),
            a: { color: theme('colors.ycs-pink'), textDecoration: 'underline' },
            strong: { color: theme('colors.white') },
            h1: { color: theme('colors.white') },
            h2: { color: theme('colors.white') },
            h3: { color: theme('colors.white') },
            h4: { color: theme('colors.white') },
            code: {
              backgroundColor: theme('colors.zinc.800'),
              color: theme('colors.ycs-pink'),
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.9em',
            },
            pre: {
              backgroundColor: theme('colors.zinc.900'),
              color: theme('colors.ycs-pink'),
              padding: '1rem',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
            },
            blockquote: {
              borderLeftColor: theme('colors.zinc.600'),
              color: theme('colors.white'),
              fontStyle: 'normal',
            },
            'ul > li::marker': {
              color: theme('colors.zinc.400'),
            },
            hr: { borderColor: theme('colors.zinc.700') },
          },
        },
      }),
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      textShadow: {
        sm: '0 1px 2px var(--tw-shadow-color)',
        DEFAULT: '0 2px 4px var(--tw-shadow-color)',
        lg: '0 8px 16px var(--tw-shadow-color)',
        xl: '0 16px 32px var(--tw-shadow-color)',
      },
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
          lilac: '#d9ccff',
          sky: '#b9dcff',
          aqua: '#bfe8f7',
          mint: '#c2f0e4',
          peach: '#ffd9c7',
          blush: '#ffcfe4',
        },
        ink: {
          950: '#07070b',
          900: '#0b0b11',
          800: '#111119',
          700: '#181823',
        },
        // The house blues: the light spell-glow of the logo, and the deeper
        // azure it sits on
        spell: {
          DEFAULT: '#90c8ff',
          soft: '#bcdcff',
          deep: '#3f88d6',
        },
        azure: {
          DEFAULT: '#0071bc',
          soft: '#4ea3e8',
          deep: '#004a7c',
        },
        ember: '#f45a5a',
        'ycs-black': '#141414',
        'ycs-pink': '#90c8ff',
        // Was an empty string, which silently produced broken classes
        'ycs-faded-pink': '#f2a6b6',
        'ycs-old-pink': '#F45A5A', // strong logo pink
        'ycs-blue': '#0071BC',
        'ycs-green': '#39A393',
        'ycs-security-red': '#890c0c',
        'ycs-gray': '#323844',
        'sparkle-gold': '#FFD700',
      },
      boxShadow: {
        // Soft, wide and low-contrast - light-theme cards lift with shadow
        // rather than with a lit edge
        card: '0 10px 30px -14px rgba(31,32,51,0.22)',
        'card-lg': '0 26px 50px -22px rgba(31,32,51,0.28)',
        glow: '0 0 60px -12px rgba(0,113,188,0.35)',
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
      fontSize: {
        big: '200px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
export default config;