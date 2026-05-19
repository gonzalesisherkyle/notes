// client/tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        ink: {
          base: '#121413',
          deep: '#0d0f0e',
          low: '#1a1c1b',
          surface: '#1e201f',
          high: '#282a29',
          highest: '#333534',
        },
        quiet: {
          text: '#e2e3e1',
          muted: '#c1c8c1',
          outline: '#424843',
          primary: '#a9cfb7',
          primaryDeep: '#2d4f3c',
          secondary: '#b9c7e0',
          amber: '#f3c969',
          danger: '#ffb4ab',
        },
      },
      fontFamily: {
        ui: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        editor: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      maxWidth: {
        editor: '720px',
      },
      spacing: {
        sidebar: '260px',
      },
      borderRadius: {
        app: '0.5rem',
      },
    },
  },
  plugins: [],
};
