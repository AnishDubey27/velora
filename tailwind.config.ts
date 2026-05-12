import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bone: {
          bg: "#0A0F1C",
          panel: "#101524",
          panel2: "#151A2B",
          stroke: "#252B3E",
          text: "#F4F7FB",
          muted: "#8E96A7",
          faint: "#4D566C",
          teal: "#00D4FF",
          tealSoft: "#143E4D",
          red: "#FF4D5E",
          green: "#3DF0A4",
          amber: "#F6C45F"
        }
      },
      boxShadow: {
        glow: "0 0 38px rgba(0, 212, 255, 0.22)",
        card: "0 18px 48px rgba(0, 0, 0, 0.28)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
