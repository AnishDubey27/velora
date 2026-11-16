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
        vel: {
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
        },
        /* Beautiful UI semantic color ramp */
        page: "var(--page)",
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        inset: "var(--inset)",
        hover: "var(--hover)",
        "hover-2": "var(--hover-2)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        "line-soft": "var(--line-soft)",
        field: "var(--field)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        "accent-tint": "var(--accent-tint)",
      },
      boxShadow: {
        glow: "0 0 38px rgba(0, 212, 255, 0.22)",
        card: "0 18px 48px rgba(0, 0, 0, 0.28)",
        hairline: "var(--shadow-hairline)",
        btn: "var(--shadow-btn)",
        overlay: "var(--shadow-overlay)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
