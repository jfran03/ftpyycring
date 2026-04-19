/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["*.{html,js}", "javascript/**/*.{js,ts}"],
  theme: {
    extend: {
      fontFamily: {
        lion: "Times New Roman, Times, serif",
        ftpSans: '"Plus Jakarta Sans", system-ui, sans-serif',
        ftpMono: '"IBM Plex Mono", ui-monospace, monospace',
      },
      colors: {
        mustard: {
          500: "#B26500",
          400: "#DAAD30",
          100: "#FFFCF7",
        },
        burgundy: {
          500: "#B52828",
          400: "#CD1543",
        },
        navy: {
          900: "#0A0D1E",
          800: "#151620",
          500: "#4F587C",
          400: "#4977A1",
        },
        lime: {
          700: "#485521",
          400: "#9E9E38",
        },
        black: {
          900: "#202020",
          800: "#19191B",
        },
        ftp: {
          red: "#CE1126",
          blue: "#0038A8",
          gold: "#FCD116",
        },
      },
    },
  },
  plugins: [],
};
