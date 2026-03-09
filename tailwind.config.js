/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './data/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  safelist: [
    'bg-yellow-600',
    'bg-gray-600',
    'bg-red-700',
  ],
  plugins: [],
};
