/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1F4D3A",
        primaryDark: "#16382A",
        primaryLight: "#2F6B52",
        secondary: "#D4A24C",
        secondaryLight: "#E6C27A",
        secondaryDark: "#B8842F",
        background: "#F8F6F2",
        border: "#E5E7EB",
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
        info: "#60A5FA",
        neutral: "#9CA3AF"
      }
    }
  },
  plugins: []
};