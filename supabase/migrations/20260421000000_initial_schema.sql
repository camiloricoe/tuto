-- =============================================================
-- TUTO — Initial schema migration
-- All tables, RLS, functions, triggers, views, indexes
-- =============================================================

-- Create audit schema for trigger function
CREATE SCHEMA IF NOT EXISTS audit;

-- =============================================================
-- 1. TENANCY & USERS
-- =============================================================

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  settings jsonb NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  document_type text,
  document_number text,
  phone text,
  avatar_url text,
  two_factor_required boolean NOT NULL DEFAULT false,
  two_factor_enabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;

CREATE TABLE user_tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);
ALTER TABLE user_tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenant_memberships FORCE ROW LEVEL SECURITY;

-- =============================================================
-- 2. RBAC
-- =============================================================

CREATE TABLE roles_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE roles_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_catalog FORCE ROW LEVEL SECURITY;

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  resource text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions FORCE ROW LEVEL SECURITY;

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  based_on_role_id uuid REFERENCES roles_catalog(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  revoked_at timestamptz
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;

-- =============================================================
-- 3. ACADEMIC CATALOGS
-- =============================================================

CREATE TABLE academic_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  modality text NOT NULL DEFAULT 'fixed_curriculum',
  duration_periods int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
ALTER TABLE academic_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_programs FORCE ROW LEVEL SECURITY;

CREATE TABLE academic_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  program_id uuid REFERENCES academic_programs(id),
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'semester',
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
ALTER TABLE academic_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_periods FORCE ROW LEVEL SECURITY;

CREATE TABLE grading_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  scale_min numeric NOT NULL DEFAULT 0,
  scale_max numeric NOT NULL DEFAULT 5,
  passing_grade numeric NOT NULL DEFAULT 3,
  uses_letters boolean NOT NULL DEFAULT false,
  letter_mapping jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
ALTER TABLE grading_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_schemes FORCE ROW LEVEL SECURITY;

CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES academic_programs(id),
  code text NOT NULL,
  name text NOT NULL,
  credits int,
  default_grading_scheme_id uuid REFERENCES grading_schemes(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects FORCE ROW LEVEL SECURITY;

CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id),
  period_id uuid NOT NULL REFERENCES academic_periods(id),
  teacher_id uuid REFERENCES auth.users(id),
  section_code text NOT NULL DEFAULT 'A',
  grading_scheme_id uuid NOT NULL REFERENCES grading_schemes(id),
  max_students int,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses FORCE ROW LEVEL SECURITY;

CREATE TABLE course_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  weight numeric NOT NULL,
  sequence int NOT NULL DEFAULT 0,
  due_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE course_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_evaluations FORCE ROW LEVEL SECURITY;

CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id),
  course_id uuid NOT NULL REFERENCES courses(id),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  final_grade numeric,
  final_letter text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE (student_id, course_id)
);
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments FORCE ROW LEVEL SECURITY;

-- =============================================================
-- 4. GRADES
-- =============================================================

CREATE TABLE grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id),
  evaluation_id uuid NOT NULL REFERENCES course_evaluations(id),
  value numeric NOT NULL,
  letter text,
  comment text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (enrollment_id, evaluation_id)
);
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades FORCE ROW LEVEL SECURITY;

-- =============================================================
-- 5. PAYMENTS
-- =============================================================

CREATE TABLE payment_concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  default_amount numeric(12,2),
  recurring boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
ALTER TABLE payment_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_concepts FORCE ROW LEVEL SECURITY;

CREATE TABLE student_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id),
  concept_id uuid NOT NULL REFERENCES payment_concepts(id),
  program_id uuid REFERENCES academic_programs(id),
  period_id uuid REFERENCES academic_periods(id),
  amount numeric(12,2) NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
ALTER TABLE student_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_charges FORCE ROW LEVEL SECURITY;

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'COP',
  method text NOT NULL,
  reference text,
  paid_on date NOT NULL,
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  proof_file_url text,
  notes text,
  status text NOT NULL DEFAULT 'confirmed',
  external_transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;

CREATE TABLE payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  charge_id uuid NOT NULL REFERENCES student_charges(id),
  amount_applied numeric(12,2) NOT NULL
);
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations FORCE ROW LEVEL SECURITY;

CREATE TABLE receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL UNIQUE REFERENCES payments(id),
  number text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  pdf_url text NOT NULL DEFAULT '',
  voided boolean NOT NULL DEFAULT false
);
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts FORCE ROW LEVEL SECURITY;

-- =============================================================
-- 6. AUDIT & LOGS
-- =============================================================

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL,
  action_code text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  summary text NOT NULL,
  metadata jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log FORCE ROW LEVEL SECURITY;

CREATE TABLE auth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event text NOT NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_events FORCE ROW LEVEL SECURITY;

-- Audit tables (trigger-generated)
CREATE TABLE grades_audit (
  audit_id bigserial PRIMARY KEY,
  operation char(1) NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  row_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text
);

CREATE TABLE payments_audit (
  audit_id bigserial PRIMARY KEY,
  operation char(1) NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  row_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text
);

CREATE TABLE student_charges_audit (
  audit_id bigserial PRIMARY KEY,
  operation char(1) NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  row_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text
);

CREATE TABLE enrollments_audit (
  audit_id bigserial PRIMARY KEY,
  operation char(1) NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  row_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text
);

CREATE TABLE user_roles_audit (
  audit_id bigserial PRIMARY KEY,
  operation char(1) NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  row_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text
);

CREATE TABLE user_profiles_audit (
  audit_id bigserial PRIMARY KEY,
  operation char(1) NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  row_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text
);

-- =============================================================
-- 7. NOTIFICATIONS
-- =============================================================

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

CREATE TABLE email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  to_email text NOT NULL,
  to_user_id uuid,
  template_code text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE email_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_deliveries FORCE ROW LEVEL SECURITY;

-- =============================================================
-- 8. IMPORT
-- =============================================================

CREATE TABLE import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity text NOT NULL,
  status text NOT NULL,
  total_rows int,
  processed_rows int,
  error_rows int,
  errors_summary jsonb,
  csv_file_key text,
  metadata jsonb,
  executed_by uuid NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history FORCE ROW LEVEL SECURITY;

-- =============================================================
-- 9. FUNCTIONS
-- =============================================================

-- Auth helper: get user's tenant IDs
CREATE OR REPLACE FUNCTION public.user_tenants()
RETURNS SETOF uuid AS $$
  SELECT tenant_id FROM user_tenant_memberships
  WHERE user_id = auth.uid() AND active = true
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Auth helper: check permission
CREATE OR REPLACE FUNCTION public.has_permission(
  p_permission text,
  p_tenant_id uuid DEFAULT NULL
) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND ur.revoked_at IS NULL
      AND (p_tenant_id IS NULL OR ur.tenant_id = p_tenant_id)
      AND p.code = p_permission
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Auth helper: check if user is self
CREATE OR REPLACE FUNCTION public.is_self(p_user_id uuid)
RETURNS boolean AS $$
  SELECT auth.uid() = p_user_id
$$ LANGUAGE sql STABLE;

-- Audit context setter
CREATE OR REPLACE FUNCTION public.set_audit_context(
  p_user_id uuid,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  PERFORM set_config('app.user_id', COALESCE(p_user_id::text, ''), true);
  PERFORM set_config('app.ip', COALESCE(p_ip, ''), true);
  PERFORM set_config('app.user_agent', COALESCE(p_user_agent, ''), true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit.log_changes()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
  v_ip inet;
  v_ua text;
BEGIN
  v_user_id := nullif(current_setting('app.user_id', true), '')::uuid;
  v_ip := nullif(current_setting('app.ip', true), '')::inet;
  v_ua := nullif(current_setting('app.user_agent', true), '');

  IF TG_OP = 'INSERT' THEN
    EXECUTE format(
      'INSERT INTO %I (operation, changed_at, changed_by, row_id, old_data, new_data, ip_address, user_agent)
       VALUES (''I'', now(), $1, $2, NULL, $3, $4, $5)',
      TG_TABLE_NAME || '_audit'
    ) USING v_user_id, NEW.id, to_jsonb(NEW), v_ip, v_ua;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    EXECUTE format(
      'INSERT INTO %I (operation, changed_at, changed_by, row_id, old_data, new_data, ip_address, user_agent)
       VALUES (''U'', now(), $1, $2, $3, $4, $5, $6)',
      TG_TABLE_NAME || '_audit'
    ) USING v_user_id, NEW.id, to_jsonb(OLD), to_jsonb(NEW), v_ip, v_ua;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    EXECUTE format(
      'INSERT INTO %I (operation, changed_at, changed_by, row_id, old_data, new_data, ip_address, user_agent)
       VALUES (''D'', now(), $1, $2, $3, NULL, $4, $5)',
      TG_TABLE_NAME || '_audit'
    ) USING v_user_id, OLD.id, to_jsonb(OLD), v_ip, v_ua;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Receipt number generator
CREATE OR REPLACE FUNCTION public.next_receipt_number(
  p_tenant_id uuid,
  p_year int
) RETURNS text AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM receipts
  WHERE tenant_id = p_tenant_id
    AND EXTRACT(YEAR FROM issued_at) = p_year;
  RETURN p_year::text || '-' || lpad(v_count::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Seed default roles for a tenant
CREATE OR REPLACE FUNCTION public.seed_default_roles_for_tenant(p_tenant_id uuid)
RETURNS void AS $$
DECLARE
  v_catalog_id uuid;
  v_role_id uuid;
  v_perm_id uuid;
  v_code text;
BEGIN
  -- Create roles from catalog for this tenant
  FOR v_catalog_id, v_code IN
    SELECT id, code FROM roles_catalog
  LOOP
    INSERT INTO roles (tenant_id, code, name, based_on_role_id)
    SELECT p_tenant_id, v_code, name, v_catalog_id
    FROM roles_catalog WHERE id = v_catalog_id
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_role_id;

    IF v_role_id IS NOT NULL THEN
      -- Assign all permissions based on role code
      IF v_code IN ('super_admin', 'admin') THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_role_id, id FROM permissions
        ON CONFLICT DO NOTHING;
      ELSIF v_code = 'coordinator' THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_role_id, id FROM permissions
        WHERE resource IN ('programs', 'courses', 'subjects', 'periods', 'enrollments', 'grades', 'users', 'audit')
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- 10. TRIGGERS
-- =============================================================

-- Audit triggers
CREATE TRIGGER audit_grades
  AFTER INSERT OR UPDATE OR DELETE ON grades
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

CREATE TRIGGER audit_student_charges
  AFTER INSERT OR UPDATE OR DELETE ON student_charges
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

CREATE TRIGGER audit_enrollments
  AFTER INSERT OR UPDATE OR DELETE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

-- Updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON academic_programs FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON academic_periods FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON grading_schemes FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payment_concepts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON student_charges FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================
-- 11. RLS POLICIES
-- =============================================================

-- Helper: auto-create user_profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- TENANTS
CREATE POLICY "tenant_select_member" ON tenants FOR SELECT
  USING (id IN (SELECT user_tenants()));
CREATE POLICY "tenant_insert_authenticated" ON tenants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tenant_update_member" ON tenants FOR UPDATE
  USING (id IN (SELECT user_tenants()) AND has_permission('tenants:write', id));

-- USER PROFILES
CREATE POLICY "profile_select_self_or_tenant" ON user_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_tenant_memberships m
      WHERE m.user_id = user_profiles.id
        AND m.tenant_id IN (SELECT user_tenants())
        AND m.active = true
    )
  );
CREATE POLICY "profile_update_self" ON user_profiles FOR UPDATE
  USING (id = auth.uid());
CREATE POLICY "profile_insert_system" ON user_profiles FOR INSERT
  WITH CHECK (true); -- handled by trigger

-- USER TENANT MEMBERSHIPS
CREATE POLICY "membership_select_own_or_admin" ON user_tenant_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR tenant_id IN (SELECT user_tenants())
  );
CREATE POLICY "membership_insert_admin" ON user_tenant_memberships FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT user_tenants())
    AND has_permission('users:write', tenant_id)
  );
CREATE POLICY "membership_update_admin" ON user_tenant_memberships FOR UPDATE
  USING (
    tenant_id IN (SELECT user_tenants())
    AND has_permission('users:write', tenant_id)
  );

-- GLOBAL CATALOGS (roles_catalog, permissions)
CREATE POLICY "catalog_select_authenticated" ON roles_catalog FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "catalog_manage_system" ON roles_catalog FOR ALL
  USING (has_permission('system:manage', NULL));

CREATE POLICY "permissions_select_authenticated" ON permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "permissions_manage_system" ON permissions FOR ALL
  USING (has_permission('system:manage', NULL));

-- ROLES
CREATE POLICY "roles_select_tenant" ON roles FOR SELECT
  USING (tenant_id IS NULL OR tenant_id IN (SELECT user_tenants()));
CREATE POLICY "roles_manage_admin" ON roles FOR ALL
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('roles:write', tenant_id));

-- ROLE PERMISSIONS
CREATE POLICY "role_perms_select" ON role_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = role_permissions.role_id
        AND (r.tenant_id IS NULL OR r.tenant_id IN (SELECT user_tenants()))
    )
  );

-- USER ROLES
CREATE POLICY "user_roles_select" ON user_roles FOR SELECT
  USING (
    user_id = auth.uid()
    OR tenant_id IN (SELECT user_tenants())
  );
CREATE POLICY "user_roles_manage" ON user_roles FOR ALL
  USING (
    tenant_id IN (SELECT user_tenants())
    AND has_permission('roles:write', tenant_id)
  );

-- ACADEMIC PROGRAMS
CREATE POLICY "programs_select" ON academic_programs FOR SELECT
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('programs:read', tenant_id));
CREATE POLICY "programs_insert" ON academic_programs FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('programs:write', tenant_id));
CREATE POLICY "programs_update" ON academic_programs FOR UPDATE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('programs:write', tenant_id));

-- ACADEMIC PERIODS
CREATE POLICY "periods_select" ON academic_periods FOR SELECT
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('periods:read', tenant_id));
CREATE POLICY "periods_insert" ON academic_periods FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('periods:write', tenant_id));
CREATE POLICY "periods_update" ON academic_periods FOR UPDATE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('periods:write', tenant_id));

-- GRADING SCHEMES
CREATE POLICY "schemes_select" ON grading_schemes FOR SELECT
  USING (tenant_id IN (SELECT user_tenants()));
CREATE POLICY "schemes_insert" ON grading_schemes FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('programs:write', tenant_id));
CREATE POLICY "schemes_update" ON grading_schemes FOR UPDATE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('programs:write', tenant_id));

-- SUBJECTS
CREATE POLICY "subjects_select" ON subjects FOR SELECT
  USING (tenant_id IN (SELECT user_tenants()));
CREATE POLICY "subjects_insert" ON subjects FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('programs:write', tenant_id));
CREATE POLICY "subjects_update" ON subjects FOR UPDATE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('programs:write', tenant_id));

-- COURSES
CREATE POLICY "courses_select" ON courses FOR SELECT
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('courses:read', tenant_id));
CREATE POLICY "courses_insert" ON courses FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('courses:write', tenant_id));
CREATE POLICY "courses_update" ON courses FOR UPDATE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('courses:write', tenant_id));

-- COURSE EVALUATIONS
CREATE POLICY "evals_select" ON course_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_evaluations.course_id
        AND c.tenant_id IN (SELECT user_tenants())
    )
  );
CREATE POLICY "evals_insert" ON course_evaluations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_evaluations.course_id
        AND c.tenant_id IN (SELECT user_tenants())
        AND (c.teacher_id = auth.uid() OR has_permission('courses:write', c.tenant_id))
    )
  );
CREATE POLICY "evals_update" ON course_evaluations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_evaluations.course_id
        AND c.tenant_id IN (SELECT user_tenants())
        AND (c.teacher_id = auth.uid() OR has_permission('courses:write', c.tenant_id))
    )
  );

-- ENROLLMENTS
CREATE POLICY "enrollments_select" ON enrollments FOR SELECT
  USING (
    tenant_id IN (SELECT user_tenants())
    AND (
      has_permission('enrollments:read', tenant_id)
      OR student_id = auth.uid()
      OR EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
    )
  );
CREATE POLICY "enrollments_insert" ON enrollments FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('enrollments:write', tenant_id));
CREATE POLICY "enrollments_update" ON enrollments FOR UPDATE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('enrollments:write', tenant_id));

-- GRADES
CREATE POLICY "grades_select" ON grades FOR SELECT
  USING (
    tenant_id IN (SELECT user_tenants())
    AND (
      has_permission('grades:read', tenant_id)
      OR EXISTS (
        SELECT 1 FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        WHERE e.id = grades.enrollment_id AND c.teacher_id = auth.uid()
      )
      OR (
        status = 'published'
        AND EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.id = grades.enrollment_id AND e.student_id = auth.uid()
        )
      )
    )
  );
CREATE POLICY "grades_insert" ON grades FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT user_tenants())
    AND has_permission('grades:write', tenant_id)
    AND EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.id = enrollment_id AND c.teacher_id = auth.uid()
    )
  );
CREATE POLICY "grades_update" ON grades FOR UPDATE
  USING (
    tenant_id IN (SELECT user_tenants())
    AND has_permission('grades:write', tenant_id)
    AND EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.id = grades.enrollment_id AND c.teacher_id = auth.uid()
    )
  );

-- PAYMENT CONCEPTS
CREATE POLICY "concepts_select" ON payment_concepts FOR SELECT
  USING (tenant_id IN (SELECT user_tenants()));
CREATE POLICY "concepts_insert" ON payment_concepts FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('concepts:write', tenant_id));
CREATE POLICY "concepts_update" ON payment_concepts FOR UPDATE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('concepts:write', tenant_id));

-- STUDENT CHARGES
CREATE POLICY "charges_select" ON student_charges FOR SELECT
  USING (
    tenant_id IN (SELECT user_tenants())
    AND (has_permission('charges:read', tenant_id) OR student_id = auth.uid())
  );
CREATE POLICY "charges_insert" ON student_charges FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('charges:write', tenant_id));
CREATE POLICY "charges_update" ON student_charges FOR UPDATE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('charges:write', tenant_id));

-- PAYMENTS
CREATE POLICY "payments_select" ON payments FOR SELECT
  USING (
    tenant_id IN (SELECT user_tenants())
    AND (has_permission('payments:read', tenant_id) OR student_id = auth.uid())
  );
CREATE POLICY "payments_insert" ON payments FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('payments:write', tenant_id));
CREATE POLICY "payments_update" ON payments FOR UPDATE
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('payments:write', tenant_id));

-- PAYMENT ALLOCATIONS
CREATE POLICY "allocations_select" ON payment_allocations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_allocations.payment_id
        AND p.tenant_id IN (SELECT user_tenants())
    )
  );
CREATE POLICY "allocations_insert" ON payment_allocations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_allocations.payment_id
        AND p.tenant_id IN (SELECT user_tenants())
        AND has_permission('payments:write', p.tenant_id)
    )
  );

-- RECEIPTS
CREATE POLICY "receipts_select" ON receipts FOR SELECT
  USING (
    tenant_id IN (SELECT user_tenants())
    AND (
      has_permission('receipts:read', tenant_id)
      OR EXISTS (
        SELECT 1 FROM payments p
        WHERE p.id = receipts.payment_id AND p.student_id = auth.uid()
      )
    )
  );
CREATE POLICY "receipts_insert" ON receipts FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('receipts:write', tenant_id));

-- ACTIVITY LOG
CREATE POLICY "activity_select" ON activity_log FOR SELECT
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('audit:read', tenant_id));
CREATE POLICY "activity_insert" ON activity_log FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()));

-- AUTH EVENTS
CREATE POLICY "auth_events_select" ON auth_events FOR SELECT
  USING (user_id = auth.uid() OR has_permission('audit:read', NULL));
CREATE POLICY "auth_events_insert" ON auth_events FOR INSERT
  WITH CHECK (true); -- system writes

-- NOTIFICATIONS
CREATE POLICY "notif_select_own" ON notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "notif_insert_system" ON notifications FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()));

-- EMAIL DELIVERIES
CREATE POLICY "email_select_admin" ON email_deliveries FOR SELECT
  USING (has_permission('audit:read', tenant_id));
CREATE POLICY "email_insert_system" ON email_deliveries FOR INSERT
  WITH CHECK (true);

-- IMPORT HISTORY
CREATE POLICY "import_select" ON import_history FOR SELECT
  USING (tenant_id IN (SELECT user_tenants()) AND has_permission('import:read', tenant_id));
CREATE POLICY "import_insert" ON import_history FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenants()) AND has_permission('import:write', tenant_id));

-- AUDIT TABLES (read-only for authorized users)
ALTER TABLE grades_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_charges_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select" ON grades_audit FOR SELECT USING (has_permission('audit:read', NULL));
CREATE POLICY "audit_insert_trigger" ON grades_audit FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_select" ON payments_audit FOR SELECT USING (has_permission('audit:read', NULL));
CREATE POLICY "audit_insert_trigger" ON payments_audit FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_select" ON student_charges_audit FOR SELECT USING (has_permission('audit:read', NULL));
CREATE POLICY "audit_insert_trigger" ON student_charges_audit FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_select" ON enrollments_audit FOR SELECT USING (has_permission('audit:read', NULL));
CREATE POLICY "audit_insert_trigger" ON enrollments_audit FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_select" ON user_roles_audit FOR SELECT USING (has_permission('audit:read', NULL));
CREATE POLICY "audit_insert_trigger" ON user_roles_audit FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_select" ON user_profiles_audit FOR SELECT USING (has_permission('audit:read', NULL));
CREATE POLICY "audit_insert_trigger" ON user_profiles_audit FOR INSERT WITH CHECK (true);

-- =============================================================
-- 12. INDEXES
-- =============================================================

CREATE INDEX idx_enrollments_course ON enrollments (course_id);
CREATE INDEX idx_payments_student ON payments (student_id, paid_on DESC);
CREATE INDEX idx_charges_student_status ON student_charges (student_id, status);
CREATE INDEX idx_notifications_unread ON notifications (user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_activity_log_tenant ON activity_log (tenant_id, occurred_at DESC);
CREATE INDEX idx_grades_audit_row ON grades_audit (row_id, changed_at DESC);
CREATE INDEX idx_grades_audit_user ON grades_audit (changed_by, changed_at DESC);
CREATE INDEX idx_payments_audit_row ON payments_audit (row_id, changed_at DESC);
CREATE INDEX idx_charges_audit_row ON student_charges_audit (row_id, changed_at DESC);
CREATE INDEX idx_enrollments_audit_row ON enrollments_audit (row_id, changed_at DESC);
CREATE INDEX idx_user_roles_audit_row ON user_roles_audit (row_id, changed_at DESC);
CREATE INDEX idx_profiles_audit_row ON user_profiles_audit (row_id, changed_at DESC);

-- =============================================================
-- 13. VIEWS
-- =============================================================

CREATE OR REPLACE VIEW v_student_account_statement AS
SELECT
  sc.tenant_id,
  sc.student_id,
  SUM(sc.amount) AS total_charged,
  COALESCE(SUM(pa_sum.paid), 0) AS total_paid,
  SUM(sc.amount) - COALESCE(SUM(pa_sum.paid), 0) AS balance_due,
  MIN(CASE WHEN sc.status IN ('pending', 'partial') THEN sc.due_date END) AS next_due_date,
  COUNT(*) FILTER (WHERE sc.status IN ('pending', 'partial') AND sc.due_date < CURRENT_DATE) AS overdue_count
FROM student_charges sc
LEFT JOIN LATERAL (
  SELECT SUM(pa.amount_applied) AS paid
  FROM payment_allocations pa
  WHERE pa.charge_id = sc.id
) pa_sum ON true
WHERE sc.deleted_at IS NULL AND sc.status != 'void'
GROUP BY sc.tenant_id, sc.student_id;

CREATE OR REPLACE VIEW v_course_performance AS
SELECT
  c.tenant_id,
  c.id AS course_id,
  s.code AS subject_code,
  s.name AS subject_name,
  ap.code AS period_code,
  COUNT(e.id) AS enrollments_count,
  COUNT(e.id) FILTER (WHERE e.status = 'completed') AS completed_count,
  COUNT(e.id) FILTER (WHERE e.status = 'completed' AND e.final_grade >= gs.passing_grade) AS passed_count,
  AVG(e.final_grade) FILTER (WHERE e.final_grade IS NOT NULL) AS avg_final_grade
FROM courses c
JOIN subjects s ON s.id = c.subject_id
JOIN academic_periods ap ON ap.id = c.period_id
JOIN grading_schemes gs ON gs.id = c.grading_scheme_id
LEFT JOIN enrollments e ON e.course_id = c.id AND e.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.tenant_id, c.id, s.code, s.name, ap.code, gs.passing_grade;

CREATE OR REPLACE VIEW v_admin_income_summary AS
SELECT
  p.tenant_id,
  date_trunc('month', p.paid_on)::date AS month,
  pc.code AS concept_code,
  pc.name AS concept_name,
  p.method,
  COUNT(p.id) AS payment_count,
  SUM(p.amount) FILTER (WHERE p.status = 'confirmed') AS total_confirmed,
  SUM(pa.amount_applied) AS total_applied
FROM payments p
JOIN payment_allocations pa ON pa.payment_id = p.id
JOIN student_charges sc ON sc.id = pa.charge_id
JOIN payment_concepts pc ON pc.id = sc.concept_id
WHERE p.deleted_at IS NULL
GROUP BY p.tenant_id, date_trunc('month', p.paid_on), pc.code, pc.name, p.method;

CREATE OR REPLACE VIEW v_overdue_charges AS
SELECT
  sc.tenant_id,
  sc.id AS charge_id,
  sc.student_id,
  up.full_name AS student_name,
  sc.amount,
  COALESCE(pa_sum.paid, 0) AS amount_paid,
  sc.amount - COALESCE(pa_sum.paid, 0) AS balance_due,
  sc.due_date,
  (CURRENT_DATE - sc.due_date) AS days_overdue
FROM student_charges sc
JOIN user_profiles up ON up.id = sc.student_id
LEFT JOIN LATERAL (
  SELECT SUM(pa.amount_applied) AS paid
  FROM payment_allocations pa
  WHERE pa.charge_id = sc.id
) pa_sum ON true
WHERE sc.deleted_at IS NULL
  AND sc.status IN ('pending', 'partial')
  AND sc.due_date < CURRENT_DATE;
