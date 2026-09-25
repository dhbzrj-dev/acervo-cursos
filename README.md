# Acervo de Cursos — Telegram Mini App

Catálogo de cursos em formato de Telegram Mini App. Cada curso é um canal
privado do Telegram, com assinatura mensal cobrada em **Stars** através de
links de convite pagos nativos do Telegram (`createChatInviteLink` com
`subscription_period` + `subscription_price`).

## Estrutura do monorepo

```
acervo-cursos/
├── frontend/   # React + Vite + TS + Tailwind — o Mini App em si
├── backend/    # Node + Fastify — API que serve cursos/categorias e valida initData
└── bot/        # Node + grammY — bot que abre o Mini App e cria os invite links
```

## Ordem recomendada de implementação

1. **Frontend (feito nesta etapa)** — telas, design system, dados mockados.
2. **Backend** — API REST (`/courses`, `/categories`, `/me/subscriptions`),
   validação de `initData`, integração com Postgres.
3. **Bot** — comando `/start` que abre o Mini App, criação de invite links
   pagos por curso, webhook de `chat_join_request` / pagamentos.
4. **Autenticação** — validar `Telegram.WebApp.initData` no backend (HMAC com
   o token do bot) para identificar o usuário em `/me/*`.

Este primeiro entregável cobre o item 1. Ao final, pergunto qual dos itens
2–4 você quer que eu implemente em seguida.

## Rodando o frontend localmente

```bash
cd frontend
npm install
npm run dev
```

O app espera rodar dentro do Telegram (WebView do Mini App), mas fora dele
ele cai em modo "standalone" com dados mockados e tema escuro fixo, então dá
para desenvolver normalmente no navegador.

## Deploy

- **Frontend**: Vercel (build estático do Vite). Configurar a URL pública no
  BotFather como a URL do Mini App (`/setmenubutton` ou `/newapp`).
- **Backend**: qualquer host Node (Fly.io, Railway, Render). Precisa de HTTPS.
- **Bot**: processo long-running separado (webhook ou polling).
