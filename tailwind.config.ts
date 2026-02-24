import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          primary: '#3A5A40',
          accent: '#A3B18A',
          bg: '#F5F5F4',
          text: '#1C1C1C',
          muted: '#D6D3D1',
        },
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
