/** @type {import('tailwindcss').Config} */
// Palette: a dawn departure — soft sky blues, peach horizon, navy night, with warm runway-light amber as the only strong accent.
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0d1b36', 2: '#132447', 3: '#1d3260', deep: '#08142b' },  // night sky / terminal
        amber: { DEFAULT: '#f2b84b', dim: '#b98a2e' },                               // runway lights, board text
        paper: { DEFAULT: '#f5f8fc', 2: '#e8eff8', line: '#d3deec' },               // cabin white
        sky: { DEFAULT: '#3d6fd6', soft: '#9cc3f0', pale: '#d8e8f8', mist: '#eef5fc' },
        dawn: { DEFAULT: '#f6d5bd', soft: '#fbe9dc' },                               // horizon peach
        tail: { DEFAULT: '#e7795d' },                                                // livery coral
        go: { DEFAULT: '#2fbf71' },
        muted: '#5a6b84',
        steel: '#9fb0c8',
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', '"Arial Narrow"', 'Impact', 'sans-serif'],
        body: ['"Instrument Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      maxWidth: { wrap: '1180px' },
      keyframes: {
        blink: { '50%': { opacity: '.55' } },
        bob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        strobe: { '0%,8%,16%': { opacity: '1' }, '4%,12%,20%,100%': { opacity: '0' } },
      },
      animation: {
        blink: 'blink 2.4s steps(1) infinite',
        bob: 'bob 5s ease-in-out infinite',
        strobe: 'strobe 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
