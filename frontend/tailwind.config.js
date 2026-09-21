/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F9F8F6', // off-white paper tone
        foreground: '#111827', // deep crisp charcoal for body text
        primary: {
          DEFAULT: '#1E293B', // deep navy / charcoal
          foreground: '#FFFFFF', // bright crisp white text on primary buttons
        },
        secondary: {
          DEFAULT: '#8C7355', // muted gold/brass
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#800000', // maroon
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#E5E5E5',
          foreground: '#4B5563',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'], // body
        serif: ['Merriweather', 'Georgia', 'serif'], // headings
      }
    },
  },
  plugins: [],
}
