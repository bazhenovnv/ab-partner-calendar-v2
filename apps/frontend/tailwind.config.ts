import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0D2344',
        mint: '#7CD8B3',
        'selected-day': '#367D67',
        'green-marker': '#015A3F',
        'completed-marker': '#ACACAC',
        'date-hover': '#E4E4E4',
        'dropdown-border': '#E8E3DC',
        'live-status': '#FFDB99',
        'completed-status': '#A3A3A3',
      },
      fontFamily: {
        montserrat: ['var(--font-montserrat)', 'sans-serif'],
        gilroy: ['var(--font-gilroy)', 'sans-serif'],
      },
      boxShadow: {
        base: '0 4px 4px rgba(0,0,0,0.25)',
      },
      screens: {
        mobile: '390px',
        tablet: '1024px',
        desktop: '1440px',
        wide: '1920px',
      },
    },
  },
  plugins: [],
};

export default config;
