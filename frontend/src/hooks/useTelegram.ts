import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { WebApp, getTelegramUser, isInsideTelegram } from "@/lib/telegram";

/**
 * Controla o BackButton nativo do Telegram: mostra em qualquer tela que não
 * seja a Home, e volta para a tela anterior ao ser tocado. Isso substitui a
 * necessidade de um botão de "voltar" próprio na UI, seguindo o padrão de
 * navegação nativo dos Mini Apps.
 */
export function useTelegramBackButton(showOnRoot = false) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInsideTelegram()) return;

    const onClick = () => navigate(-1);

    if (showOnRoot) {
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(onClick);
    } else {
      WebApp.BackButton.hide();
    }

    return () => {
      WebApp.BackButton.offClick(onClick);
    };
  }, [navigate, showOnRoot]);
}

/** Expõe o usuário logado (nome, foto) vindo do Telegram, se disponível. */
export function useTelegramUser() {
  return getTelegramUser();
}
