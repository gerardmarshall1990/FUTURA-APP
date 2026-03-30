-- Migration: Add new onboarding profile columns
-- These support the identity engine: name, DOB, star sign, life path, belief system

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dob_day INT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dob_month INT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dob_year INT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS star_sign TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS life_path_number INT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS belief_system TEXT;

-- Palm vision analysis features (JSON object from GPT-4o vision)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS palm_features_json JSONB;

-- Add last_active_at to users for lifecycle engine
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();
