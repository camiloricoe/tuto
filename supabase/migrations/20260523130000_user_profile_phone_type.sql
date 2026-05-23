-- =============================================================
-- Phase 1: enrich user profiles — add phone_type
-- Additive: no rename / no backfill needed (nullable column)
-- Allowed values constrained via CHECK to keep enum-like semantics
-- without locking us out of future additions.
-- =============================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS phone_type text;

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_phone_type_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_phone_type_check
  CHECK (phone_type IS NULL OR phone_type IN ('mobile', 'whatsapp', 'landline'));
