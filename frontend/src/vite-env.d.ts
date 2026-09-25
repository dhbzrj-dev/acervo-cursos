/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// O script telegram-web-app.js (carregado no index.html) injeta esse
// objeto global antes do React montar. @twa-dev/sdk usa esse mesmo objeto
// internamente; declaramos aqui só para o TypeScript parar de reclamar
// quando checamos `window.Telegram?.WebApp?.initData` fora do SDK.
interface Window {
  Telegram?: {
    WebApp?: {
      initData?: string;
    };
  };
}
