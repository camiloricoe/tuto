-- =============================================================
-- TUTO — Onboarding milestone dismissals
-- =============================================================
-- Per-user dismissal state for onboarding milestones. Milestone
-- completion is detected from real data (not stored here); this
-- table only records milestones the user actively chose to hide.
--
-- tenant_id IS NULL for global (super_admin) milestones.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.user_milestone_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  milestone_code text NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now()
);

-- Partial unique indexes so (user, tenant, code) is unique for
-- tenant-scoped milestones and (user, code) is unique for global.
CREATE UNIQUE INDEX IF NOT EXISTS user_milestone_dismissals_tenant_unique
  ON public.user_milestone_dismissals (user_id, tenant_id, milestone_code)
  WHERE tenant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_milestone_dismissals_global_unique
  ON public.user_milestone_dismissals (user_id, milestone_code)
  WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_milestone_dismissals_user
  ON public.user_milestone_dismissals (user_id);

ALTER TABLE public.user_milestone_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_milestone_dismissals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "milestone_dismiss_select_own" ON public.user_milestone_dismissals;
CREATE POLICY "milestone_dismiss_select_own"
  ON public.user_milestone_dismissals
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "milestone_dismiss_insert_own" ON public.user_milestone_dismissals;
CREATE POLICY "milestone_dismiss_insert_own"
  ON public.user_milestone_dismissals
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "milestone_dismiss_delete_own" ON public.user_milestone_dismissals;
CREATE POLICY "milestone_dismiss_delete_own"
  ON public.user_milestone_dismissals
  FOR DELETE
  USING (user_id = auth.uid());
