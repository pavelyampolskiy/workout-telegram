/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        bebas: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontWeight: {
        display: '700',
      },
    },
  },
  plugins: [],
};
