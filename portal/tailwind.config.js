/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        td: {
          bg: '#0F0F1A',
          surface: '#1A1A2E',
          border: '#2E2E4E',
          accent: '#7B5EA7',
          gold: '#C9A84C',
          text: '#E8E8F0',
          muted: '#888899',
          success: '#4CAF82',
          danger: '#E05555',
        },
      },
    },
  },
  plugins: [],
};
