-- Migration 003: Beta access table
-- Tracks users who have activated a beta code.
-- Used by isBetaUser() for server-side paywall bypass.

CREATE TABLE IF NOT EXISTS beta_access (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_used    TEXT        NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)   -- one active code per user; re-activation overwrites via upsert
);

-- Index for the lookup pattern: SELECT 1 FROM beta_access WHERE user_id = $1
CREATE INDEX IF NOT EXISTS beta_access_user_id_idx ON beta_access(user_id);
