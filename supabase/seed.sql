-- =============================================================
-- TUTO — Seed data for local development
-- =============================================================

-- 1. Roles catalog (system-level)
INSERT INTO roles_catalog (code, name, description, is_system) VALUES
  ('super_admin', 'Super Admin', 'Full system access across all tenants', true),
  ('admin', 'Admin', 'Full access within a tenant', true),
  ('coordinator', 'Coordinator', 'Academic coordination within a tenant', true),
  ('treasurer', 'Treasurer', 'Financial management within a tenant', true),
  ('teacher', 'Teacher', 'Course and grade management', true),
  ('student', 'Student', 'View own academic and financial data', true)
ON CONFLICT (code) DO NOTHING;

-- 2. Permissions catalog
INSERT INTO permissions (code, resource, action, description) VALUES
  -- System
  ('system:manage', 'system', 'manage', 'Full system management'),
  -- Tenants
  ('tenants:read', 'tenants', 'read', 'View tenant info'),
  ('tenants:write', 'tenants', 'write', 'Manage tenant settings'),
  -- Users
  ('users:read', 'users', 'read', 'View users'),
  ('users:write', 'users', 'write', 'Create/edit users'),
  -- Roles
  ('roles:read', 'roles', 'read', 'View roles'),
  ('roles:write', 'roles', 'write', 'Assign/revoke roles'),
  -- Academic
  ('programs:read', 'programs', 'read', 'View programs'),
  ('programs:write', 'programs', 'write', 'Manage programs'),
  ('periods:read', 'periods', 'read', 'View academic periods'),
  ('periods:write', 'periods', 'write', 'Manage academic periods'),
  ('courses:read', 'courses', 'read', 'View courses'),
  ('courses:write', 'courses', 'write', 'Manage courses'),
  ('enrollments:read', 'enrollments', 'read', 'View enrollments'),
  ('enrollments:read:own', 'enrollments', 'read:own', 'View own enrollments'),
  ('enrollments:write', 'enrollments', 'write', 'Manage enrollments'),
  -- Grades
  ('grades:read', 'grades', 'read', 'View all grades'),
  ('grades:read:own', 'grades', 'read:own', 'View own grades'),
  ('grades:write', 'grades', 'write', 'Enter/edit grades'),
  ('grades:publish', 'grades', 'publish', 'Publish grades'),
  -- Payments
  ('payments:read', 'payments', 'read', 'View all payments'),
  ('payments:read:own', 'payments', 'read:own', 'View own payments'),
  ('payments:write', 'payments', 'write', 'Record payments'),
  ('payments:void', 'payments', 'void', 'Void payments'),
  ('charges:read', 'charges', 'read', 'View charges'),
  ('charges:write', 'charges', 'write', 'Create/edit charges'),
  ('concepts:read', 'concepts', 'read', 'View payment concepts'),
  ('concepts:write', 'concepts', 'write', 'Manage payment concepts'),
  ('receipts:read', 'receipts', 'read', 'View receipts'),
  ('receipts:write', 'receipts', 'write', 'Generate receipts'),
  -- Audit
  ('audit:read', 'audit', 'read', 'View audit logs'),
  -- Import
  ('import:read', 'import', 'read', 'View import history'),
  ('import:write', 'import', 'write', 'Execute imports'),
  -- Notifications
  ('notifications:read', 'notifications', 'read', 'View notifications'),
  ('notifications:write', 'notifications', 'write', 'Send notifications')
ON CONFLICT (code) DO NOTHING;
