-- ============================================================
-- Futura MVP — Database Schema
-- Supabase / Postgres
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- Core identity record. Created on first visit (anonymous auth).
-- ============================================================
CREATE TABLE users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  guest_id                TEXT UNIQUE,                        -- Supabase anon auth UID
  email                   TEXT UNIQUE,                        -- Nullable — collected later
  subscription_status     TEXT NOT NULL DEFAULT 'free'        -- 'free' | 'active' | 'cancelled' | 'past_due'
                          CHECK (subscription_status IN ('free','active','cancelled','past_due')),
  unlock_status           BOOLEAN NOT NULL DEFAULT FALSE,     -- One-time purchase
  remaining_chat_messages INT NOT NULL DEFAULT 2,             -- Free: 2, Unlocked: 10, Sub: 999
  stripe_customer_id      TEXT UNIQUE,                        -- Set on first Stripe interaction
  platform                TEXT NOT NULL DEFAULT 'web'
                          CHECK (platform IN ('web','ios','android'))
);

-- Index for fast guest session lookup
CREATE INDEX idx_users_guest_id ON users(guest_id);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);

-- ============================================================
-- USER PROFILES
-- The identity layer — the real product moat.
-- Generated from onboarding answers via profileNormalizationService.
-- ============================================================
CREATE TABLE user_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Raw onboarding answers
  focus_area          TEXT NOT NULL CHECK (focus_area IN ('love','money','life_direction')),
  current_state       TEXT NOT NULL CHECK (current_state IN ('feeling_stuck','turning_point','okay_but_uncertain')),
  personality_trait   TEXT NOT NULL CHECK (personality_trait IN ('overthink_decisions','trust_people_easily','keep_things_to_myself')),
  age_band            TEXT NOT NULL CHECK (age_band IN ('18-24','25-34','35-44','45+')),
  palm_image_url      TEXT,                                   -- Supabase Storage URL

  -- Derived identity fields (set by profileNormalizationService)
  core_pattern        TEXT,   -- e.g. 'mental_overprocessing', 'open_then_recalibrates', 'guarded_depth'
  emotional_pattern   TEXT,   -- e.g. 'internalizes uncertainty'
  decision_pattern    TEXT,   -- e.g. 'delays action until pressure builds'
  future_theme        TEXT,   -- e.g. 'a delayed shift is approaching'
  identity_summary    TEXT,   -- Human-readable persistent anchor, reused in all prompts

  -- Optional hint from palm image (reserved for future CV)
  palm_style_hint     TEXT    -- nullable, e.g. 'long lines', 'complex intersection'
);

-- Only one active profile per user in MVP
CREATE UNIQUE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(user_id, created_at DESC);

-- ============================================================
-- READINGS
-- Teaser + full reading content for each user.
-- ============================================================
CREATE TABLE readings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Reading content
  teaser_text   TEXT NOT NULL,   -- Visible to free users (Recognition + Past + Present + Near-Future)
  cut_line      TEXT NOT NULL,   -- The final blurred/cut sentence
  locked_text   TEXT NOT NULL,   -- Deeper continuation — unlocked after purchase
  full_text     TEXT             -- Optional combined field for display convenience

  -- Future: add reading_version INT for A/B testing reading styles
);

CREATE INDEX idx_readings_user_id ON readings(user_id, created_at DESC);

-- ============================================================
-- CHAT SESSIONS
-- One session per user engagement. Can have multiple in the future
-- (e.g. daily sessions), but MVP treats it as one active session.
-- ============================================================
CREATE TABLE chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reading_id  UUID NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id, created_at DESC);

-- ============================================================
-- CHAT MESSAGES
-- Individual turns in a chat session.
-- ============================================================
CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role        TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content     TEXT NOT NULL
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id, created_at ASC);

-- ============================================================
-- USER INSIGHTS MEMORY
-- Lightweight memory store. Grows with usage.
-- Powers future daily insights, relationship engine, decision engine.
-- ============================================================
CREATE TABLE user_insights_memory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  key_theme   TEXT NOT NULL,     -- e.g. 'relationship_hesitation', 'frequent_money_questions'
  description TEXT,              -- Human-readable detail
  source      TEXT               -- e.g. 'onboarding', 'chat', 'reading'
);

CREATE INDEX idx_user_insights_memory_user_id ON user_insights_memory(user_id);

-- ============================================================
-- MONETIZATION EVENTS
-- Append-only audit trail of all payment events.
-- Do not update rows — always insert.
-- ============================================================
CREATE TABLE monetization_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type  TEXT NOT NULL,     -- 'unlock_purchased' | 'subscription_started' | 'subscription_cancelled' | 'subscription_renewed' | 'payment_failed'
  event_value NUMERIC(10,2),     -- Dollar amount
  metadata    JSONB              -- Stripe session ID, product ID, etc.
);

CREATE INDEX idx_monetization_events_user_id ON monetization_events(user_id, created_at DESC);
CREATE INDEX idx_monetization_events_type ON monetization_events(event_type);

-- ============================================================
-- USED BLOCKS
-- Tracks which reading blocks have been shown to each user.
-- Prevents repetition in future readings (Phase 2+).
-- ============================================================
CREATE TABLE used_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  block_type  TEXT NOT NULL,     -- e.g. 'recognition', 'past_validation', 'current_state', 'near_future', 'locked'
  block_key   TEXT NOT NULL      -- e.g. 'mental_overprocessing_1', 'feeling_stuck_2'
);

CREATE UNIQUE INDEX idx_used_blocks_user_block ON used_blocks(user_id, block_key);
CREATE INDEX idx_used_blocks_user_id ON used_blocks(user_id);

-- ============================================================
-- ANALYTICS EVENTS
-- Lightweight event log. Use PostHog for full analytics,
-- but keep a local copy for easy querying.
-- ============================================================
CREATE TABLE analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_name  TEXT NOT NULL,
  properties  JSONB
);

CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS on all user-data tables so Supabase anon key
-- cannot access other users' data.
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_insights_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own row
CREATE POLICY "users: own row only"
  ON users FOR ALL
  USING (guest_id = auth.uid()::text);

-- Profiles scoped to user
CREATE POLICY "user_profiles: own data only"
  ON user_profiles FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE guest_id = auth.uid()::text));

-- Readings scoped to user
CREATE POLICY "readings: own data only"
  ON readings FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE guest_id = auth.uid()::text));

-- Chat sessions scoped to user
CREATE POLICY "chat_sessions: own data only"
  ON chat_sessions FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE guest_id = auth.uid()::text));

-- Chat messages accessible via session
CREATE POLICY "chat_messages: own data only"
  ON chat_messages FOR ALL
  USING (session_id IN (
    SELECT id FROM chat_sessions
    WHERE user_id IN (SELECT id FROM users WHERE guest_id = auth.uid()::text)
  ));

-- Memory scoped to user
CREATE POLICY "user_insights_memory: own data only"
  ON user_insights_memory FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE guest_id = auth.uid()::text));

-- Monetization events — read-only for users, write via service role only
CREATE POLICY "monetization_events: read own"
  ON monetization_events FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE guest_id = auth.uid()::text));

-- Used blocks scoped to user
CREATE POLICY "used_blocks: own data only"
  ON used_blocks FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE guest_id = auth.uid()::text));

-- Analytics — insert from client, read via service role
CREATE POLICY "analytics_events: insert own"
  ON analytics_events FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE guest_id = auth.uid()::text));

-- ============================================================
-- STRIPE WEBHOOK HELPER FUNCTION
-- Called by the /api/subscription/webhook route handler
-- via supabase.rpc() to atomically update user state.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_unlock_purchase(
  p_user_id UUID,
  p_amount   NUMERIC,
  p_metadata JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET unlock_status = TRUE,
      remaining_chat_messages = GREATEST(remaining_chat_messages, 10)
  WHERE id = p_user_id;

  INSERT INTO monetization_events (user_id, event_type, event_value, metadata)
  VALUES (p_user_id, 'unlock_purchased', p_amount, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_subscription_started(
  p_user_id UUID,
  p_amount   NUMERIC,
  p_metadata JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET subscription_status = 'active',
      remaining_chat_messages = 999
  WHERE id = p_user_id;

  INSERT INTO monetization_events (user_id, event_type, event_value, metadata)
  VALUES (p_user_id, 'subscription_started', p_amount, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_subscription_cancelled(
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET subscription_status = 'cancelled'
  WHERE id = p_user_id;

  INSERT INTO monetization_events (user_id, event_type, event_value, metadata)
  VALUES (p_user_id, 'subscription_cancelled', NULL, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
