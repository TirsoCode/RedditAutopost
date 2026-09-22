-- RedditAutoPost schema
-- Applied by db/migrate.js (idempotent).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Single-user MVP: one row, reused after OAuth login.
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reddit_username   VARCHAR(60) UNIQUE,
  web_url           VARCHAR(500),
  post_frequency    INT NOT NULL DEFAULT 2 CHECK (post_frequency BETWEEN 1 AND 3),
  spam_threshold    VARCHAR(10) NOT NULL DEFAULT 'medio' CHECK (spam_threshold IN ('bajo','medio','alto')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Encrypted OAuth tokens (one row per connected Reddit account).
CREATE TABLE IF NOT EXISTS reddit_auth (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reddit_username   VARCHAR(60),
  access_token      TEXT NOT NULL,   -- AES-256-GCM encrypted
  refresh_token     TEXT,            -- AES-256-GCM encrypted
  expires_at        TIMESTAMPTZ,
  scope             VARCHAR(300),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS subreddits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subreddit_name    VARCHAR(50) NOT NULL,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  added_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, subreddit_name)
);

CREATE TABLE IF NOT EXISTS posts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subreddit_name      VARCHAR(50) NOT NULL,
  original_post_id    VARCHAR(20) NOT NULL,
  original_post_title TEXT,
  original_post_url   TEXT,
  original_post_body  TEXT,
  relevance_reason    TEXT,
  drafted_content     TEXT,
  spam_risk           VARCHAR(10) CHECK (spam_risk IN ('bajo','medio','alto')),
  spam_suggestion     TEXT,
  status              VARCHAR(12) NOT NULL DEFAULT 'candidate'
                        CHECK (status IN ('candidate','draft','approved','published','rejected')),
  published_url       TEXT,
  reddit_post_id      VARCHAR(20),
  title_override      VARCHAR(300),
  upvotes             INT NOT NULL DEFAULT 0,
  comments            INT NOT NULL DEFAULT 0,
  engagement_score    DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at        TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, original_post_id)
);

-- Hourly engagement snapshots per published post.
CREATE TABLE IF NOT EXISTS post_stats (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  upvotes           INT NOT NULL DEFAULT 0,
  downvotes         INT,
  comments          INT NOT NULL DEFAULT 0,
  awards            INT NOT NULL DEFAULT 0,
  engagement_score  DECIMAL(10,2) NOT NULL DEFAULT 0,
  tracked_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_status        ON posts (status);
CREATE INDEX IF NOT EXISTS idx_posts_user_status   ON posts (user_id, status);
CREATE INDEX IF NOT EXISTS idx_subreddits_user     ON subreddits (user_id, active);
CREATE INDEX IF NOT EXISTS idx_post_stats_post     ON post_stats (post_id, tracked_at DESC);
