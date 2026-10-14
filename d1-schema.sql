-- Cloudflare D1 Schema for SmartVocab.io
-- Run via: npx wrangler d1 execute <DATABASE_NAME> --file=./d1-schema.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email_canonical TEXT UNIQUE NOT NULL,
  email_display TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'user'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'rejected' | 'suspended'
  timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  request_note TEXT,
  requested_at INTEGER,
  decided_at INTEGER,
  decided_by TEXT,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS login_otps (
  id TEXT PRIMARY KEY,
  email_canonical TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent TEXT,
  revoked_at INTEGER
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  new_cards_per_day INTEGER NOT NULL DEFAULT 20,
  max_reviews_per_day INTEGER NOT NULL DEFAULT 100,
  card_direction TEXT NOT NULL DEFAULT 'en_vi',
  auto_pronounce INTEGER NOT NULL DEFAULT 1,
  ai_enabled INTEGER NOT NULL DEFAULT 1,
  ai_consent_at INTEGER,
  theme TEXT NOT NULL DEFAULT 'system',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  ai_kill_switch INTEGER NOT NULL DEFAULT 0,
  ai_daily_budget INTEGER NOT NULL DEFAULT 1000,
  default_daily_lookup_quota INTEGER NOT NULL DEFAULT 50,
  default_daily_reading_quota INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  term TEXT NOT NULL,
  term_normalized TEXT NOT NULL,
  meaning_vi TEXT NOT NULL,
  definition_en TEXT,
  phonetic TEXT,
  part_of_speech TEXT,
  synonyms_json TEXT,
  antonyms_json TEXT,
  example TEXT,
  group_name TEXT,
  field_sources_json TEXT,
  flagged_hard INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_card_state (
  user_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'en_vi', -- 'en_vi' | 'vi_en'
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  due_at INTEGER NOT NULL,
  last_reviewed_at INTEGER,
  suspended INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, card_id, direction)
);

CREATE TABLE IF NOT EXISTS review_logs (
  review_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  rating INTEGER NOT NULL, -- 1=Again, 2=Hard, 3=Good, 4=Easy
  mode TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  reviewed_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  prev_state_json TEXT
);

CREATE TABLE IF NOT EXISTS dictionary_cache (
  cache_key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reading_passages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  passage TEXT NOT NULL,
  level TEXT NOT NULL,
  topic TEXT NOT NULL,
  target_card_ids_json TEXT,
  target_words_json TEXT,
  questions_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  day TEXT NOT NULL, -- YYYY-MM-DD
  kind TEXT NOT NULL, -- 'lookup' | 'reading'
  count INTEGER NOT NULL DEFAULT 0,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_card_state_due ON user_card_state(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);
