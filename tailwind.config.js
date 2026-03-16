/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        crt: {
          bg: '#0a0a14',
          coastline: '#00ff88',
          grid: '#112211',
          defender: '#ff3333',
          attacker: '#3399ff',
          tanker: '#ffaa00',
          text: '#00ff88',
          warning: '#ff3333',
          mine: '#ffff00',
        },
      },
      fontFamily: {
        crt: ['"Courier New"', 'Courier', 'monospace'],
      },
    },
  },
  plugins: [],
};
