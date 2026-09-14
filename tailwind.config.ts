/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#d9e8ff',
          200: '#b3d4ff',
          300: '#80bfff',
          400: '#4da3ff',
          500: '#268aff',
          600: '#0066cc',
          700: '#1a5cdb',
          800: '#204db8',
          900: '#26418c'
        },
        surface: {
          light: '#ffffff',
          lighter: '#f7fafc',
          medium: '#edf2f7',
          dark: '#e2e8f0',
          darker: '#cbd5e0'
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          700: '#dc2626'
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          700: '#16a34a'
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          700: '#d97706'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
