/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#fbfbf9",
        ink: "#111111",
        alert: "#c0392b",
        rule: "#e5e5e5",
        muted: "#666666",
        faint: "#999999",
      },
      fontFamily: {
        serif: ['"EB Garamond"', '"IBM Plex Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        mast: ['"EB Garamond"', 'Georgia', 'serif'],
      },
      maxWidth: {
        pageX: '1400px',
      },
    },
  },
  plugins: [],
};
