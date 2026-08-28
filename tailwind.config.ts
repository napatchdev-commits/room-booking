import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        resort: {
          50: '#f4f8f7',
          100: '#e5f0ed',
          200: '#cfe2dd',
          300: '#abccc3',
          400: '#7eaea2',
          500: '#589185',
          600: '#43756b',
          700: '#375e57',
          800: '#2f4c47',
          900: '#2a413d',
          950: '#162523',
        },
        agoda: {
          blue: '#1355ff',
          red: '#e12d2d',
          orange: '#ff6600',
          yellow: '#ffaa00',
          green: '#00a65a',
        }
      },
      fontFamily: {
        sans: ['var(--font-prompt)', 'var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
