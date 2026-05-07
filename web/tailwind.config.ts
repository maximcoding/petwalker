import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          500: '#5b6dff',
          600: '#4456f0',
          700: '#3743be',
        },
      },
    },
  },
  plugins: [],
};

export default config;
