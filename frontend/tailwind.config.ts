import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: "#F8FAFC",
          900: "#0F172A",
          950: "#020617",
        },
        brand: {
          primary: "#0F172A",
          secondary: "#1E293B",
          accent: "#2563EB",
        },
        confidence: {
          high: {
            text: "#065F46",
            bg: "#ECFDF5",
            badge: "#10B981",
            border: "#A7F3D0",
          },
          amber: {
            text: "#92400E",
            bg: "#FFFBEB",
            badge: "#F59E0B",
            border: "#FDE68A",
          },
          red: {
            text: "#991B1B",
            bg: "#FEF2F2",
            badge: "#EF4444",
            border: "#FECACA",
          },
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
