/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#0a0e27',
          navy: '#1a1f3a',
        },
        accent: {
          cyan: '#00f5ff',
          purple: '#b026ff',
        },
        success: '#00ff88',
        danger: '#ff6b35',
      },
    },
  },
  plugins: [],
}

