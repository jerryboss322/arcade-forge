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
        card: "16px",
        container: "20px",
        control: "10px",
      },
      boxShadow: {
        arcade: "0 1px 2px rgba(0, 0, 0, 0.45), 0 12px 32px -12px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        "arcade-lg": "0 4px 12px rgba(0, 0, 0, 0.45), 0 24px 56px -16px rgba(0, 0, 0, 0.78), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        "arcade-sm": "0 1px 2px rgba(0, 0, 0, 0.35), 0 4px 12px -4px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "-apple-system", "sans-serif"],
        editorial: ["var(--font-editorial)", "Georgia", "Times New Roman", "serif"],
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
