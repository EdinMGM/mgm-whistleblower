/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mgm: {
          dark: '#374B47',
          green: '#44BB66',
          light: '#F0F5F2',
          border: '#C8DDD0',
          bg: '#E4EDF3',
          muted: '#5F6567',
        },
      },
      fontFamily: {
        sans: ['Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
