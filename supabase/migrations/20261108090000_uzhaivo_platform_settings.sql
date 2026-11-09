-- DRAFT ONLY — review and apply after production admin authentication/RLS are ready.
-- Central configuration consumed by the Uzhaivo worker and owner apps.
BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id text PRIMARY KEY CHECK (id = 'global'),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (id, settings, updated_by)
VALUES ('global', '{
  "applications_enabled": true,
  "proof_submissions_enabled": true,
  "owner_contact_requires_approval": true,
  "auto_decrement_need": true,
  "auto_delete_filled_jobs": true,
  "include_worker_profile_snapshot": true,
  "allow_owner_front_back_selection": true,
  "default_proof_side": "both",
  "allowed_proof_types": ["driving_license", "aadhaar_card", "pan_card", "experience_certificate", "skill_certificate", "vehicle_rc", "insurance", "other_document"],
  "app_theme": "light",
  "app_font_size": "Medium",
  "app_language": "en",
  "app_version": "1.0.0"
}'::jsonb, '9025421145')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.platform_settings FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.platform_settings TO authenticated;

CREATE POLICY uzhaivo_platform_settings_admin_only
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.uzhaivo_is_admin())
  WITH CHECK (public.uzhaivo_is_admin());

COMMIT;
