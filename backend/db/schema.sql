-- Schema de referência para o Acervo de Cursos.
-- Será usado quando implementarmos o backend (Fastify + Postgres).

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  emoji       TEXT NOT NULL,
  "order"     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS courses (
  id            TEXT PRIMARY KEY,
  category_id   TEXT NOT NULL REFERENCES categories(id),
  name          TEXT NOT NULL,
  description   TEXT NOT NULL,
  benefits      TEXT[] NOT NULL DEFAULT '{}',
  cover_url     TEXT NOT NULL,
  price_stars   INTEGER NOT NULL CHECK (price_stars > 0),
  invite_link   TEXT NOT NULL,      -- link de convite pago (Stars/mês) criado via Bot API
  channel_id    TEXT NOT NULL,      -- id do canal privado no Telegram
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                 BIGSERIAL PRIMARY KEY,
  telegram_user_id   BIGINT NOT NULL,
  course_id          TEXT NOT NULL REFERENCES courses(id),
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  renews_at          DATE NOT NULL,
  channel_deep_link  TEXT NOT NULL,  -- t.me/c/... para reabrir o canal
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (telegram_user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON user_subscriptions(telegram_user_id);
