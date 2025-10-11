/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1a73e8',
        success: '#27ae60',
        warning: '#f39c12',
        danger: '#e74c3c',
      },
    },
  },
  plugins: [],
};
