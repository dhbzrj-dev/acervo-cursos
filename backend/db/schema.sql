-- Schema do Olimpocursos, espelhando o banco de produção (Neon).
-- Idempotente: pode ser aplicado de novo (`npm run db:migrate`) sem perder
-- dados; só cria o que estiver faltando.

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
  invite_link   TEXT NOT NULL,      -- link de assinatura paga (Stars/mês)
  channel_id    TEXT NOT NULL,      -- id do canal privado no Telegram
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS preview_url TEXT;  -- vídeo de amostra

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
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS renewal_reminder_sent_on DATE;

-- Ainda não usada pelo código; reservada para avisar sobre cursos novos.
CREATE TABLE IF NOT EXISTS user_category_follows (
  telegram_user_id  BIGINT NOT NULL,
  category_id       TEXT NOT NULL REFERENCES categories(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (telegram_user_id, category_id)
);

-- Sala (chat global anônimo)
CREATE TABLE IF NOT EXISTS chat_aliases (
  telegram_user_id  BIGINT PRIMARY KEY,
  nickname          TEXT NOT NULL UNIQUE,
  avatar            TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id                BIGSERIAL PRIMARY KEY,
  telegram_user_id  BIGINT NOT NULL,
  body              TEXT NOT NULL,
  reply_to_id       BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_bans (
  telegram_user_id  BIGINT PRIMARY KEY,
  banned_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quem pode receber avisos do bot (deu /start ou abriu o app pelo bot).
CREATE TABLE IF NOT EXISTS bot_users (
  telegram_user_id    BIGINT PRIMARY KEY,
  first_name          TEXT,
  username            TEXT,
  notify_new_courses  BOOLEAN NOT NULL DEFAULT TRUE,
  blocked_at          TIMESTAMPTZ,      -- bot bloqueado pelo usuário (403)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tamanho do curso, calculado no painel a partir da pasta de vídeos.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS modules_count INTEGER;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS lessons_count INTEGER;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Quando o aviso de "curso novo" foi disparado (evita notificar duas vezes).
ALTER TABLE courses ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON user_subscriptions(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_follows_category ON user_category_follows(category_id);
CREATE INDEX IF NOT EXISTS chat_messages_id_idx ON chat_messages(id DESC);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages(telegram_user_id, id DESC);
