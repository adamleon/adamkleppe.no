import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        serif: [
          "Source Serif 4",
          "Source Serif Pro",
          "Georgia",
          "ui-serif",
          "serif",
        ],
      },
      colors: {
        ink: {
          DEFAULT: "#1a1a1a",
          muted: "#525252",
        },
        paper: {
          DEFAULT: "#fafaf7",
          dark: "#0e0e0e",
        },
        accent: {
          DEFAULT: "#a01e1e",
          dark: "#d35454",
        },
      },
      maxWidth: {
        prose: "70ch",
      },
    },
  },
  plugins: [typography],
};
