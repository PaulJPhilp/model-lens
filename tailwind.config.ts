import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,tsx}",
    "./components/**/*.{js,ts,tsx}",
    "./app/**/*.{js,ts,tsx}",
    "./src/**/*.{js,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-secondary-foreground)",
        },
        destructive: "var(--color-destructive)",
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-foreground)",
        },
        brand: "var(--color-orange)",
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
        serif: ["Merriweather", "serif"],
        mono: ["Geist Mono", "Fira Code", "monospace"],
        "table-data": ["Geist Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
