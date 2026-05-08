import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // This is the key setting for class-based dark mode
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Verde de marca más cálido (tono amarillo-verde, sin tinte azul)
        emerald: {
          50: '#f2fce8',
          100: '#e2f9d4',
          200: '#c5f2a8',
          300: '#9de872',
          400: '#75dc45',
          500: '#52c42a',
          600: '#3dab1f',
          700: '#2f8619',
          800: '#28681a',
          900: '#23561b',
          950: '#0f2f0a',
        },
      },
    },
  },
  plugins: [],
}

export default config

