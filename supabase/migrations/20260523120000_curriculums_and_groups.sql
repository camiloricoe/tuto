-- =============================================================
-- TUTO — Curriculums (pensums) & student groups (cohorts)
--
-- A curriculum is a program-level template that defines which subjects
-- belong to which cycle. When a group (cohort) is created from a published
-- curriculum, the curriculum_subjects rows are SNAPSHOTTED into
-- group_subjects. From that point on, the group has its own plan and may
-- diverge from the master template without affecting it (and vice versa).
-- =============================================================

-- -------------------------------------------------------------
-- 0. Compat: ensure updated_at trigger function exists under prod name.
--    (Local initial schema names it `handle_updated_at`; production names
--     it `update_updated_at`. This block makes the migration apply on both.)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- -------------------------------------------------------------
-- 1. Permissions catalog additions
-- -------------------------------------------------------------
INSERT INTO permissions (code, resource, action, description) VALUES
  ('curriculums:read',  'curriculums', 'read',  'View curriculums (pensums)'),
  ('curriculums:write', 'curriculums', 'write', 'Manage curriculums (pensums)'),
  ('groups:read',       'groups',      'read',  'View student groups (cohorts)'),
  ('groups:write',      'groups',      'write', 'Manage student groups (cohorts)')
ON CONFLICT (code) DO NOTHING;

-- -------------------------------------------------------------
-- 2. Tables
-- -------------------------------------------------------------

-- 2.1 curriculums (pensum template, scoped to a program)
CREATE TABLE curriculums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES academic_programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  version text NOT NULL DEFAULT '1',
  cycles int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft', -- draft | published | archived
  notes text,
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE (tenant_id, program_id, name)
);
ALTER TABLE curriculums ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculums FORCE ROW LEVEL SECURITY;

-- 2.2 curriculum_subjects (which subjects, what cycle, in the template)
CREATE TABLE curriculum_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  curriculum_id uuid NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  cycle int NOT NULL,
  credits numeric, -- override; null = use subjects.credits
  is_required boolean NOT NULL DEFAULT true,
  sequence int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (curriculum_id, subject_id)
);
ALTER TABLE curriculum_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_subjects FORCE ROW LEVEL SECURITY;

-- 2.3 student_groups (cohort)
CREATE TABLE student_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES academic_programs(id) ON DELETE CASCADE,
  curriculum_id uuid REFERENCES curriculums(id) ON DELETE SET NULL, -- informational: where the snapshot came from
  name text NOT NULL,
  code text,
  intake_year int NOT NULL,
  intake_period text,
  status text NOT NULL DEFAULT 'active', -- active | graduated | archived
  current_cycle int NOT NULL DEFAULT 1,
  notes text,
  snapshotted_at timestamptz, -- when curriculum was copied in
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE (tenant_id, program_id, name)
);
ALTER TABLE student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_groups FORCE ROW LEVEL SECURITY;

-- 2.4 group_subjects (snapshotted plan, unique per group, mutable independently)
CREATE TABLE group_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  cycle int NOT NULL,
  credits numeric,
  is_required boolean NOT NULL DEFAULT true,
  sequence int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned', -- planned | in_progress | completed | skipped
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, subject_id)
);
ALTER TABLE group_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_subjects FORCE ROW LEVEL SECURITY;

-- 2.5 group_members (student -> group)
CREATE TABLE group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (group_id, student_id)
);
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- 3. courses.group_id — link a course instance to a cohort (optional)
-- -------------------------------------------------------------
ALTER TABLE courses
  ADD COLUMN group_id uuid REFERENCES student_groups(id) ON DELETE SET NULL;

-- -------------------------------------------------------------
-- 4. Indexes
-- -------------------------------------------------------------
CREATE INDEX idx_curriculums_program ON curriculums (tenant_id, program_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_curriculum_subjects_curriculum ON curriculum_subjects (curriculum_id, cycle, sequence);
CREATE INDEX idx_student_groups_program ON student_groups (tenant_id, program_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_group_subjects_group ON group_subjects (group_id, cycle, sequence);
CREATE INDEX idx_group_members_group ON group_members (group_id);
CREATE INDEX idx_group_members_student ON group_members (student_id) WHERE left_at IS NULL;
CREATE INDEX idx_courses_group ON courses (group_id) WHERE group_id IS NOT NULL;

-- -------------------------------------------------------------
-- 5. updated_at triggers (reuse existing handle_updated_at function)
-- -------------------------------------------------------------
CREATE TRIGGER set_updated_at BEFORE UPDATE ON curriculums          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON curriculum_subjects  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON student_groups       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON group_subjects       FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------------
-- 6. RLS policies — match academic_programs pattern
-- -------------------------------------------------------------

-- CURRICULUMS
CREATE POLICY "curriculums_select" ON curriculums FOR SELECT
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('curriculums:read', tenant_id));
CREATE POLICY "curriculums_insert" ON curriculums FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('curriculums:write', tenant_id));
CREATE POLICY "curriculums_update" ON curriculums FOR UPDATE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('curriculums:write', tenant_id));
CREATE POLICY "curriculums_delete" ON curriculums FOR DELETE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('curriculums:write', tenant_id));

-- CURRICULUM SUBJECTS
CREATE POLICY "curriculum_subjects_select" ON curriculum_subjects FOR SELECT
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('curriculums:read', tenant_id));
CREATE POLICY "curriculum_subjects_insert" ON curriculum_subjects FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('curriculums:write', tenant_id));
CREATE POLICY "curriculum_subjects_update" ON curriculum_subjects FOR UPDATE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('curriculums:write', tenant_id));
CREATE POLICY "curriculum_subjects_delete" ON curriculum_subjects FOR DELETE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('curriculums:write', tenant_id));

-- STUDENT GROUPS
CREATE POLICY "student_groups_select" ON student_groups FOR SELECT
  USING (
    tenant_id IN (SELECT user_tenants())
    AND (
      has_permission('groups:read', tenant_id)
      OR EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = student_groups.id
          AND gm.student_id = auth.uid()
          AND gm.left_at IS NULL
      )
    )
  );
CREATE POLICY "student_groups_insert" ON student_groups FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('groups:write', tenant_id));
CREATE POLICY "student_groups_update" ON student_groups FOR UPDATE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('groups:write', tenant_id));
CREATE POLICY "student_groups_delete" ON student_groups FOR DELETE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('groups:write', tenant_id));

-- GROUP SUBJECTS
CREATE POLICY "group_subjects_select" ON group_subjects FOR SELECT
  USING (
    tenant_id IN (SELECT user_tenants())
    AND (
      has_permission('groups:read', tenant_id)
      OR EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = group_subjects.group_id
          AND gm.student_id = auth.uid()
          AND gm.left_at IS NULL
      )
    )
  );
CREATE POLICY "group_subjects_insert" ON group_subjects FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('groups:write', tenant_id));
CREATE POLICY "group_subjects_update" ON group_subjects FOR UPDATE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('groups:write', tenant_id));
CREATE POLICY "group_subjects_delete" ON group_subjects FOR DELETE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('groups:write', tenant_id));

-- GROUP MEMBERS
CREATE POLICY "group_members_select" ON group_members FOR SELECT
  USING (
    tenant_id IN (SELECT user_tenants())
    AND (has_permission('groups:read', tenant_id) OR student_id = auth.uid())
  );
CREATE POLICY "group_members_insert" ON group_members FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('groups:write', tenant_id));
CREATE POLICY "group_members_update" ON group_members FOR UPDATE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('groups:write', tenant_id));
CREATE POLICY "group_members_delete" ON group_members FOR DELETE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('groups:write', tenant_id));

-- -------------------------------------------------------------
-- 7. snapshot_curriculum_into_group()
--
-- Copies a published curriculum's subjects into a group. Idempotent guard:
-- refuses if the group already has any group_subjects rows. Refuses if the
-- curriculum is not 'published' or if program/tenant don't match the group.
-- Returns the number of rows inserted.
--
-- SECURITY DEFINER because callers (server actions) need to bypass RLS to
-- bulk insert; tenant/program isolation is enforced explicitly below.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.snapshot_curriculum_into_group(
  p_curriculum_id uuid,
  p_group_id uuid
)
RETURNS int AS $$
DECLARE
  v_group   student_groups%ROWTYPE;
  v_curric  curriculums%ROWTYPE;
  v_count   int;
BEGIN
  SELECT * INTO v_group FROM student_groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'group_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_curric FROM curriculums WHERE id = p_curriculum_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'curriculum_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_curric.tenant_id <> v_group.tenant_id THEN
    RAISE EXCEPTION 'tenant_mismatch';
  END IF;

  IF v_curric.program_id <> v_group.program_id THEN
    RAISE EXCEPTION 'program_mismatch';
  END IF;

  IF v_curric.status <> 'published' THEN
    RAISE EXCEPTION 'curriculum_not_published';
  END IF;

  IF EXISTS (SELECT 1 FROM group_subjects WHERE group_id = p_group_id) THEN
    RAISE EXCEPTION 'group_already_snapshotted';
  END IF;

  INSERT INTO group_subjects (
    tenant_id, group_id, subject_id, cycle, credits, is_required, sequence
  )
  SELECT
    cs.tenant_id, p_group_id, cs.subject_id, cs.cycle, cs.credits, cs.is_required, cs.sequence
  FROM curriculum_subjects cs
  WHERE cs.curriculum_id = p_curriculum_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE student_groups
     SET curriculum_id = p_curriculum_id,
         snapshotted_at = now()
   WHERE id = p_group_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- snapshot_curriculum_into_group is invoked only from server actions via
-- the admin client (service_role). Block REST callers — the function has
-- no auth.uid() check inside.
REVOKE EXECUTE ON FUNCTION public.snapshot_curriculum_into_group(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.snapshot_curriculum_into_group(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.snapshot_curriculum_into_group(uuid, uuid) FROM authenticated;

-- -------------------------------------------------------------
-- 8. Backfill role_permissions for existing tenants
--
-- The seed_default_roles_for_tenant() function is only re-run when a new
-- tenant is created. Existing tenants need the new permissions linked to
-- their existing admin / super_admin / coordinator roles right now.
-- -------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'curriculums:read', 'curriculums:write', 'groups:read', 'groups:write'
)
WHERE r.code IN ('super_admin', 'admin', 'coordinator')
ON CONFLICT DO NOTHING;

-- Teachers and students also see groups they belong to (already covered by
-- the RLS predicates above using auth.uid()); no extra role_permission row
-- needed for them.

-- -------------------------------------------------------------
-- 9. Future tenants — update seed_default_roles_for_tenant()
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_default_roles_for_tenant(p_tenant_id uuid)
RETURNS void AS $$
DECLARE
  v_catalog_id uuid;
  v_role_id uuid;
  v_code text;
BEGIN
  FOR v_catalog_id, v_code IN
    SELECT id, code FROM roles_catalog
  LOOP
    INSERT INTO roles (tenant_id, code, name, based_on_role_id)
    SELECT p_tenant_id, v_code, name, v_catalog_id
    FROM roles_catalog WHERE id = v_catalog_id
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_role_id;

    IF v_role_id IS NOT NULL THEN
      IF v_code IN ('super_admin', 'admin') THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_role_id, id FROM permissions
        ON CONFLICT DO NOTHING;
      ELSIF v_code = 'coordinator' THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_role_id, id FROM permissions
        WHERE resource IN (
          'programs', 'courses', 'subjects', 'periods',
          'enrollments', 'grades', 'users', 'audit',
          'curriculums', 'groups'
        )
        ON CONFLICT DO NOTHING;
      ELSIF v_code = 'treasurer' THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_role_id, id FROM permissions
        WHERE resource IN ('payments', 'charges', 'receipts', 'concepts', 'audit')
        ON CONFLICT DO NOTHING;
      ELSIF v_code = 'teacher' THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_role_id, id FROM permissions
        WHERE code IN ('courses:read', 'grades:read', 'grades:read:own', 'grades:write', 'enrollments:read')
        ON CONFLICT DO NOTHING;
      ELSIF v_code = 'student' THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_role_id, id FROM permissions
        WHERE code IN ('courses:read', 'grades:read:own', 'payments:read:own', 'enrollments:read:own')
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
