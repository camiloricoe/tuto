-- =============================================================
-- Multi-tenant subdomain routing + per-tenant branding
-- =============================================================

-- 1. Add subdomain + custom_domain to tenants ------------------

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subdomain text,
  ADD COLUMN IF NOT EXISTS custom_domain text;

-- Backfill subdomain from slug (slug is already lowercased/sluggified)
UPDATE public.tenants
SET subdomain = LOWER(REGEXP_REPLACE(slug, '[^a-z0-9-]+', '-', 'g'))
WHERE subdomain IS NULL;

-- Enforce NOT NULL + format + uniqueness now that backfill is done
ALTER TABLE public.tenants
  ALTER COLUMN subdomain SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_subdomain_key'
  ) THEN
    ALTER TABLE public.tenants ADD CONSTRAINT tenants_subdomain_key UNIQUE (subdomain);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_custom_domain_key'
  ) THEN
    ALTER TABLE public.tenants ADD CONSTRAINT tenants_custom_domain_key UNIQUE (custom_domain);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_subdomain_format'
  ) THEN
    ALTER TABLE public.tenants ADD CONSTRAINT tenants_subdomain_format
      CHECK (subdomain ~* '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' AND length(subdomain) BETWEEN 1 AND 63);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON public.tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain
  ON public.tenants(custom_domain) WHERE custom_domain IS NOT NULL;

-- 2. tenant_branding table -----------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_branding (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  logo_url text,
  favicon_url text,
  primary_hsl text,                -- e.g. "221 83% 53%"
  accent_hsl text,
  login_message text,
  login_background_url text,
  email_from_name text,
  email_reply_to text,
  support_url text,
  support_email text,
  logo_storage_path text,          -- internal pointer for cleanup
  favicon_storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_tenant_branding_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_branding_updated_at ON public.tenant_branding;
CREATE TRIGGER tenant_branding_updated_at
  BEFORE UPDATE ON public.tenant_branding
  FOR EACH ROW EXECUTE FUNCTION public.touch_tenant_branding_updated_at();

-- Seed empty rows for existing tenants
INSERT INTO public.tenant_branding (tenant_id)
SELECT id FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- Auto-create branding row when a tenant is created
CREATE OR REPLACE FUNCTION public.seed_tenant_branding()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.tenant_branding (tenant_id) VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tenants_seed_branding ON public.tenants;
CREATE TRIGGER tenants_seed_branding
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.seed_tenant_branding();

-- 3. RLS for tenant_branding ---------------------------------

ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_branding FORCE ROW LEVEL SECURITY;

-- Anyone can READ (logo + colors needed for login page, pre-auth)
DROP POLICY IF EXISTS tenant_branding_public_read ON public.tenant_branding;
CREATE POLICY tenant_branding_public_read
  ON public.tenant_branding
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin/super_admin of tenant (or platform super_admin) can WRITE
DROP POLICY IF EXISTS tenant_branding_admin_insert ON public.tenant_branding;
CREATE POLICY tenant_branding_admin_insert
  ON public.tenant_branding
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = tenant_branding.tenant_id
        AND ur.revoked_at IS NULL
        AND r.code IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS tenant_branding_admin_update ON public.tenant_branding;
CREATE POLICY tenant_branding_admin_update
  ON public.tenant_branding
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = tenant_branding.tenant_id
        AND ur.revoked_at IS NULL
        AND r.code IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS tenant_branding_admin_delete ON public.tenant_branding;
CREATE POLICY tenant_branding_admin_delete
  ON public.tenant_branding
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.is_super_admin = true
    )
  );

-- 4. tenant-assets storage bucket ----------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read for any file in bucket (logos served from <bucket>/<tenant_id>/...)
DROP POLICY IF EXISTS "tenant_assets_public_read" ON storage.objects;
CREATE POLICY "tenant_assets_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'tenant-assets');

-- Admin/super_admin can write within their tenant's folder (path: <tenant_id>/...)
DROP POLICY IF EXISTS "tenant_assets_admin_insert" ON storage.objects;
CREATE POLICY "tenant_assets_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-assets'
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND ur.tenant_id::text = (storage.foldername(name))[1]
          AND ur.revoked_at IS NULL
          AND r.code IN ('admin', 'super_admin')
      )
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.is_super_admin = true
      )
    )
  );

DROP POLICY IF EXISTS "tenant_assets_admin_update" ON storage.objects;
CREATE POLICY "tenant_assets_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tenant-assets'
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND ur.tenant_id::text = (storage.foldername(name))[1]
          AND ur.revoked_at IS NULL
          AND r.code IN ('admin', 'super_admin')
      )
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.is_super_admin = true
      )
    )
  );

DROP POLICY IF EXISTS "tenant_assets_admin_delete" ON storage.objects;
CREATE POLICY "tenant_assets_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tenant-assets'
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND ur.tenant_id::text = (storage.foldername(name))[1]
          AND ur.revoked_at IS NULL
          AND r.code IN ('admin', 'super_admin')
      )
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.is_super_admin = true
      )
    )
  );
