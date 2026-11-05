-- DRAFT ONLY — NOT APPLIED.
-- Proposed additive schema for UZHAIVO Admin Panel.
-- Does not drop tables, rewrite existing business rows, or alter RLS on existing application tables.
-- It inserts the Boss admin roster row, or elevates that same phone to super_admin if present.
-- Requires real Supabase Phone Auth before the private tables/bucket are usable.

BEGIN;

-- Match the existing jobs table without backfilling an unknown review state.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS proof_requirements jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.jobs'::regclass
      AND conname = 'jobs_uzhaivo_status_check'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_uzhaivo_status_check
      CHECK (status IS NULL OR status IN ('open', 'pending_verification', 'approved', 'rejected'));
  END IF;
END;
$$;

-- Add non-sensitive profile metadata to the existing users relation.
-- Leave existing user values NULL rather than claiming anyone is verified.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS verified boolean,
  ADD COLUMN IF NOT EXISTS is_verified_owner boolean,
  ADD COLUMN IF NOT EXISTS blue_tick boolean,
  ADD COLUMN IF NOT EXISTS rating numeric,
  ADD COLUMN IF NOT EXISTS jobs_completed integer,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Store worker rejection/decision metadata missing from the current schema.
ALTER TABLE public.proof_submissions
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_by text;

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Admin roster used by RLS and the admin settings screen.
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('super_admin', 'moderator')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One record stores two distinct document types and their four private object keys.
-- The *_url columns must contain private Storage object paths, never public URLs.
CREATE TABLE IF NOT EXISTS public.owner_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_phone text NOT NULL,
  owner_name text,
  doc1_type text NOT NULL CHECK (doc1_type IN ('aadhaar', 'voter_id', 'driving_license')),
  doc1_front_url text NOT NULL,
  doc1_back_url text NOT NULL,
  doc2_type text NOT NULL CHECK (doc2_type IN ('aadhaar', 'voter_id', 'driving_license')),
  doc2_front_url text NOT NULL,
  doc2_back_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  verified_by text,
  CONSTRAINT owner_verifications_uzhaivo_distinct_docs CHECK (doc1_type <> doc2_type)
);

CREATE INDEX IF NOT EXISTS owner_verifications_uzhaivo_status_created_idx
  ON public.owner_verifications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS owner_verifications_uzhaivo_phone_created_idx
  ON public.owner_verifications (owner_phone, created_at DESC);

-- Seed the requested super-admin identity. Do not demote/overwrite any other number.
INSERT INTO public.admin_users (phone, role)
VALUES ('+919025421145', 'super_admin')
ON CONFLICT (phone) DO UPDATE SET role = 'super_admin';

-- This SECURITY DEFINER helper checks the authenticated JWT phone against the admin roster.
CREATE OR REPLACE FUNCTION public.uzhaivo_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users AS admin_row
    WHERE admin_row.phone = (SELECT auth.jwt() ->> 'phone')
      AND admin_row.role IN ('super_admin', 'moderator')
  );
$$;
REVOKE ALL ON FUNCTION public.uzhaivo_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.uzhaivo_is_admin() TO authenticated;

-- New admin and owner-document records are deny-by-default for anon/public users.
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_users FROM anon;
REVOKE ALL ON TABLE public.owner_verifications FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.owner_verifications TO authenticated;

CREATE POLICY uzhaivo_admin_users_select_self_or_admin
  ON public.admin_users FOR SELECT TO authenticated
  USING (phone = (SELECT auth.jwt() ->> 'phone') OR public.uzhaivo_is_admin());
CREATE POLICY uzhaivo_admin_users_insert_admin
  ON public.admin_users FOR INSERT TO authenticated
  WITH CHECK (public.uzhaivo_is_admin());
CREATE POLICY uzhaivo_admin_users_update_admin
  ON public.admin_users FOR UPDATE TO authenticated
  USING (public.uzhaivo_is_admin()) WITH CHECK (public.uzhaivo_is_admin());
CREATE POLICY uzhaivo_admin_users_delete_admin
  ON public.admin_users FOR DELETE TO authenticated
  USING (public.uzhaivo_is_admin());

CREATE POLICY uzhaivo_owner_verifications_select_owner_or_admin
  ON public.owner_verifications FOR SELECT TO authenticated
  USING (
    owner_phone = (SELECT auth.jwt() ->> 'phone')
    OR public.uzhaivo_is_admin()
  );
CREATE POLICY uzhaivo_owner_verifications_insert_owner
  ON public.owner_verifications FOR INSERT TO authenticated
  WITH CHECK (owner_phone = (SELECT auth.jwt() ->> 'phone'));
CREATE POLICY uzhaivo_owner_verifications_update_admin
  ON public.owner_verifications FOR UPDATE TO authenticated
  USING (public.uzhaivo_is_admin()) WITH CHECK (public.uzhaivo_is_admin());
CREATE POLICY uzhaivo_owner_verifications_delete_admin
  ON public.owner_verifications FOR DELETE TO authenticated
  USING (public.uzhaivo_is_admin());

-- Create a new private bucket; do not silently convert an existing bucket with this name.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'uzhaivo-private-owner-docs' AND public = true
  ) THEN
    RAISE EXCEPTION 'The uzhaivo-private-owner-docs bucket already exists as public; review it manually.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'uzhaivo-private-owner-docs'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('uzhaivo-private-owner-docs', 'uzhaivo-private-owner-docs', false);
  END IF;
END;
$$;

CREATE POLICY uzhaivo_owner_docs_read_owner_or_admin
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'uzhaivo-private-owner-docs'
    AND (
      public.uzhaivo_is_admin()
      OR (storage.foldername(name))[1] = (SELECT auth.jwt() ->> 'phone')
    )
  );
CREATE POLICY uzhaivo_owner_docs_insert_owner_or_admin
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'uzhaivo-private-owner-docs'
    AND (
      public.uzhaivo_is_admin()
      OR (storage.foldername(name))[1] = (SELECT auth.jwt() ->> 'phone')
    )
  );
CREATE POLICY uzhaivo_owner_docs_update_owner_or_admin
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'uzhaivo-private-owner-docs'
    AND (
      public.uzhaivo_is_admin()
      OR (storage.foldername(name))[1] = (SELECT auth.jwt() ->> 'phone')
    )
  )
  WITH CHECK (
    bucket_id = 'uzhaivo-private-owner-docs'
    AND (
      public.uzhaivo_is_admin()
      OR (storage.foldername(name))[1] = (SELECT auth.jwt() ->> 'phone')
    )
  );
CREATE POLICY uzhaivo_owner_docs_delete_owner_or_admin
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'uzhaivo-private-owner-docs'
    AND (
      public.uzhaivo_is_admin()
      OR (storage.foldername(name))[1] = (SELECT auth.jwt() ->> 'phone')
    )
  );

COMMIT;
