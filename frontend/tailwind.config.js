/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Design system do Acervo de Cursos — tema preto, alto contraste.
        bg: "#0A0A0A",        // fundo principal
        surface: "#141414",   // cards
        border: "#222222",    // bordas
        ink: "#FFFFFF",       // texto principal
        muted: "#A1A1AA",     // texto secundário
        accent: "#FFFFFF",    // botão principal (fundo)
        "accent-ink": "#0A0A0A", // texto sobre o botão principal
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "16px",
        btn: "14px",
      },
      boxShadow: {
        // sombra sutil, só para separar cards do fundo — nada de glow colorido
        card: "0 1px 0 0 rgba(255,255,255,0.02) inset",
      },
    },
  },
  plugins: [],
};
