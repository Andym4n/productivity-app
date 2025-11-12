/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Leet-inspired color palette
        dark: {
          bg: {
            primary: '#0B0E14', // Deep navy black
            secondary: '#111827', // Slightly lighter dark tone for cards
            tertiary: '#1E293B', // Border/outline color
          },
          text: {
            primary: '#FFFFFF', // White for strong contrast
            secondary: '#94A3B8', // Muted blue-gray for descriptions
            tertiary: '#64748B', // Uppercase labels
          },
          border: '#1E293B', // Subtle borders
        },
        accent: {
          purple: '#8B5CF6', // Primary accent
          blue: '#3B82F6', // Secondary accent
        },
      },
      boxShadow: {
        'card': '0 4px 30px rgba(0, 0, 0, 0.4)',
        'button-hover': '0 0 12px rgba(139, 92, 246, 0.4)',
        'purple-glow': '0 0 12px rgba(139, 92, 246, 0.4)',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #1E293B 0%, #0F172A 50%, #1E40AF 100%)',
        'gradient-highlight': 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
        'button-gradient': 'linear-gradient(90deg, #8B5CF6 0%, #6366F1 100%)',
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
      },
      fontFamily: {
        sans: ['Inter', 'Satoshi', 'DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

