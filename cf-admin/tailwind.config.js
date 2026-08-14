/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf2f8",
          100: "#fce7f3",
          400: "#f472b6",
          500: "#ec4899",
          600: "#db2777",
          700: "#be185d",
          900: "#831843",
        },
        night: {
          800: "#1e1b2e",
          900: "#141222",
          950: "#0c0a17",
        },
      },
      keyframes: {
        shuffle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        shuffle: "shuffle 0.4s ease-in-out infinite",
        "pop-in": "pop-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
