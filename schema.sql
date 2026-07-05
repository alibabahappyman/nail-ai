-- nail-ai 社交功能建表脚本
-- 在 Vercel 项目的 Storage → Postgres → Data Query（或 Neon 控制台 SQL Editor）里执行一次。
-- 用 gen_random_uuid() 需要 pgcrypto 扩展；Neon 默认已启用，保险起见显式建一次。

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 用户
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar        TEXT,
  bio           TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 老库补列（幂等）：早期 users 表没有 bio 时补上
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';

-- 帖子
CREATE TABLE IF NOT EXISTS posts (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts (author_id);

-- 帖子图片（一帖多图）
CREATE TABLE IF NOT EXISTS post_images (
  id       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id  TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  url      TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images (post_id);

-- 点赞（联合主键防重复）
CREATE TABLE IF NOT EXISTS likes (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes (post_id);

-- 评论
CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (post_id);

-- 收藏（联合主键防重复）
CREATE TABLE IF NOT EXISTS favorites (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites (user_id);
