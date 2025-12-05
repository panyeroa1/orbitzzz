import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        dark: {
          1: "#1C1F2E",
          2: "#161925",
          3: "#252A41",
          4: "#1E2757",
        },
        blue: {
          1: "#0E78F9",
        },
        sky: {
          1: "#C9DDFF",
          2: "#ECF0FF",
          3: "#F5FCFF",
        },
        orange: {
          1: "#FF742E",
        },
        purple: {
          1: "#830EF9",
        },
        yellow: {
          1: "#F9A90E",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(131, 14, 249, 0.4)" },
          "50%": { boxShadow: "0 0 20px rgba(131, 14, 249, 0.7)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-up": "slide-up 0.4s ease-out forwards",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
      backgroundImage: {
        hero: "url('/images/hero-background.png')",
        "cosmic-gradient": "linear-gradient(135deg, #161925 0%, #1E2757 50%, #252A41 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
