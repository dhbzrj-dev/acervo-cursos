import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./styles/index.css";
import { initTelegram } from "./lib/telegram";

// Inicializa o SDK do Telegram (expand, ready, tema) antes de montar o app.
initTelegram();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* HashRouter porque o Mini App é servido de um path estático (Vercel)
       e não queremos configurar rewrites de servidor para rotas internas */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
