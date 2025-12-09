/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      padding: {
        header: '4rem',
        footer: '9rem',
      },
      margin: {
        header: '4rem',
        footer: '9rem',
      },
      height: {
        header: '4rem',
        footer: '9rem',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
      animation: {
        wiggle: 'wiggle 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
