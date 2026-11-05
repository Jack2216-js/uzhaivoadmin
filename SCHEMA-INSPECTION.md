# Supabase schema inspection (read-only)

Inspected on 2026-11-01 after the user supplied the Project URL `https://cbijbcebcbijxmhrqwwb.supabase.co/rest/v1/`. The app uses the project root `https://cbijbcebcbijxmhrqwwb.supabase.co`. The stored anon key was used only for GET/HEAD metadata queries. Column checks used `select=<column>&limit=0`; no row contents were requested or returned during these schema probes, and no schema/data/RLS writes were made.

## Relations visible in the provided Table Editor screenshot

The screenshot shows `public.users`, `public.ads`, `public.jobs`, `public.proof_submissions`, `public.job_applications`, and `public.user_proofs`. It also shows a red “RLS disabled” badge while `proof_submissions` is selected.

## API checks

- `jobs`, `job_applications`, and `proof_submissions` respond successfully at the corrected project URL.
- Aggregate HEAD checks returned 14 rows for `jobs`, 0 for `job_applications`, and 4 for `proof_submissions` at inspection time. These are counts only; row contents were not inspected.
- `profiles`, `admin_users`, and `owner_verifications` returned PostgREST `PGRST205` (“Could not find the table ... in the schema cache”) when queried in `public`.

## Verified columns

- `public.jobs`: present: `id`, `title`, `location`, `salary`, `category`, `requires_proof`, `created_at`, `owner_id`, `phone`, `is_active`, `proof_required`, `proof_description`. Not present: `owner_phone`, `status`, `proof_requirements`. Additional checked but not present: `user_id`, `created_by`, `posted_by`, `owner`, `owner_name`, `posted_by_phone`, `job_status`, `approved`, `is_approved`, `verification_status`, `is_open`, `proof_instructions`, `requirements`, `proof_type`, `proof_document`, `worker_proof_required`, `has_proof`, `approval_status`, `approved_at`, `moderation_status`, `publish_status`, `is_live`, `active`, `document_required`, `requirement`, `requirements_text`.
- `public.job_applications`: the expected `id`, `job_id`, `worker_phone`, `worker_name`, `status`, `proof_urls`, `created_at`, and `updated_at` columns are present. A zero-row nested select confirmed a PostgREST relationship to `jobs` exists.
- `public.proof_submissions`: the expected `id`, `job_id`, `job_title`, `worker_phone`, `worker_name`, `proof_type`, `proof_url`, `status`, and `created_at` columns are present. A zero-row nested select found no PostgREST relationship to `jobs`; code cannot assume `jobs!inner(...)` for this relation.
- `public.users`: `id`, `phone`, `name`, `role`, and `created_at` are present. Checked profile columns `verified`, `is_verified_owner`, `blue_tick`, `rating`, `jobs_completed`, `gov_id_url`, `verification_docs`, `avatar_url`, `is_verified`, `profile_photo`, and `updated_at` are absent.
- `public.user_proofs`: `id`, `user_id`, `job_id`, `proof_type`, `created_at`, `image_url`, and `verified` are present. Checked columns `phone`, `user_phone`, `worker_id`, `worker_phone`, `worker_name`, `job_title`, `proof_url`, `proof_urls`, `document_type`, `doc_type`, `doc1_type`, `doc1_front_url`, `doc1_back_url`, `doc2_type`, `doc2_front_url`, `doc2_back_url`, `status`, `rejection_reason`, `verified_at`, `verified_by`, `owner_phone`, `owner_name`, `review_status`, `approval_status`, `is_verified`, and `updated_at` are absent.

## Remaining mapping decisions

The initial app brief expected `profiles`, `admin_users`, and `owner_verifications`, plus job status/owner fields that do not match the current `jobs` schema. Do not infer column/table equivalence for owner identity photos, admin roles, job ownership, or approval state. Obtain the user's explicit mapping or a schema definition before adapting sensitive views/actions. Do not apply DDL, change RLS, or read user rows without separate authorization.
