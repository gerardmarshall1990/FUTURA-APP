-- Migration: Create tables for Memory System, Daily Insights, Lifecycle Engine

-- ─── User Memories (Persistent Memory System) ────────────────────────────────
CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('identity', 'preference', 'emotional', 'event', 'behavioral')),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.5,
  source TEXT NOT NULL CHECK (source IN ('onboarding', 'chat', 'reading', 'insight', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, memory_type, key)
);

CREATE INDEX IF NOT EXISTS idx_user_memories_user ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_type ON user_memories(user_id, memory_type);

-- ─── Daily Insights ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_text TEXT NOT NULL,
  insight_date DATE NOT NULL,
  focus_area TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, insight_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_insights_user_date ON daily_insights(user_id, insight_date DESC);

-- ─── Engagement Events ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_events_user ON engagement_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_events_type ON engagement_events(event_type);

-- ─── Lifecycle Triggers ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lifecycle_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  trigger_data JSONB DEFAULT '{}',
  is_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_triggers_user ON lifecycle_triggers(user_id, is_sent);

-- ─── RLS Policies ────────────────────────────────────────────────────────────
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifecycle_triggers ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (these are server-side only tables)
CREATE POLICY "Service role full access" ON user_memories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON daily_insights FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON engagement_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON lifecycle_triggers FOR ALL USING (true) WITH CHECK (true);
