import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Mini Apps rodam dentro de um WebView do Telegram; manter o build simples
// e o host aberto (0.0.0.0) ajuda a testar via túnel (ngrok/cloudflared).
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Espelha o "paths" do tsconfig.json — o TS só checa tipos, quem
    // resolve o import em tempo de build/dev é o Vite/Rollup.
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
