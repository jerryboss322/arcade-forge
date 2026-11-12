import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        accent: "var(--color-accent)",
        "accent-2": "var(--color-accent-2)",
        warn: "var(--color-warn)",
        danger: "var(--color-danger)",
      },
      borderRadius: {
        card: "8px",
        control: "6px",
      },
      boxShadow: {
        arcade: "4px 4px 0 #000000",
        "arcade-lg": "6px 6px 0 #000000",
        "arcade-sm": "2px 2px 0 #000000",
      },
      fontFamily: {
        display: ["var(--font-display)", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
