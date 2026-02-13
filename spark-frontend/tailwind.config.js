/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spark: {
          dark: "#0f172a",
          accent: "#8b5cf6",
          soft: "#1e293b",
          text: "#f8fafc"
        }
      }
    },
  },
  plugins: [],
}