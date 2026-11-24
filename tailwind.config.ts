import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        accent:       { DEFAULT: "#0CAF60", fg: "#FFFFFF" },
        admin:        "#7C3AED",
        secondary:    "#10B981",
        tertiary:     "#FBBF24",
        quaternary:   "#34D399",
        bg:           "var(--bg)",
        fg:           "var(--fg)",
        muted:        { DEFAULT: "var(--muted)", fg: "var(--muted-fg)" },
        border:       "var(--border)",
        card:         "var(--card)",
      },
      fontFamily: {
        heading: ['"Outfit"', "system-ui", "sans-serif"],
        body:    ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm:   "8px",
        md:   "16px",
        lg:   "24px",
        full: "9999px",
      },
      boxShadow: {
        pop:         "4px 4px 0px 0px var(--shadow-color)",
        "pop-hover": "6px 6px 0px 0px var(--shadow-color)",
        "pop-soft":  "5px 5px 0px 0px var(--shadow-soft-color)",
      },
    },
  },
  plugins: [],
} satisfies Config;
