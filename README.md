# UZHAIVO Admin Panel

Responsive admin dashboard built with Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, lucide-react, and Supabase JS. The app targets the latest patched Next.js 14.2 release, `14.2.35`.

## Current status

The jobs query now uses columns confirmed on the live `public.jobs` table, including `is_active`, `phone`, `proof_required`, and `proof_description`; the app no longer requests absent `jobs.status`, `jobs.owner_phone`, or `jobs.proof_requirements`. The proof queue no longer assumes a foreign-key relationship from `proof_submissions` to `jobs`; it uses the proof row's `job_title`, and the pending-application fallback uses the confirmed relationship.

The remaining admin features do not yet match the live schema. Profile queries now target the existing `public.users` table, but its verification/rating fields are absent. `admin_users` and `owner_verifications` are not exposed in `public`; the database also shows `user_proofs`. See [`SCHEMA-INSPECTION.md`](SCHEMA-INSPECTION.md) for the read-only findings and [`TODO.md`](TODO.md) for open items. No Supabase schema or data has been changed.

## Features

- Demo admin login for `9025421145` / `+919025421145` with OTP `1234`.
- Overview metrics and recent worker/owner queues, with 10-second refresh where the required tables exist.
- Worker-proof review, Aadhaar/license filters, image inspection, realtime updates, approve/reject, and phone links; job review status cannot be written because the live `jobs` table has no `status` column.
- Job search and detail view using the verified live columns. The page displays Active/Inactive from `is_active`, can deactivate an active row, and requires confirmation before permanent deletion. This is not an approval/rejection status.
- Workers, Jobs and Owners have per-row and select-visible checkboxes, plus confirmed bulk deletion for explicitly selected records.
- Responsive navigation, cards, horizontally scrollable tables, and English/Tamil labels.
- A–Z Control Center for worker applications, proof submissions, front/back proof policy, contact privacy, worker-profile snapshots, Need-count lifecycle, allowed proof types, theme, font size, language, and app version. Controls publish to the additive `platform_settings` table after the migration is applied; until then the admin keeps a local draft.

## Local setup

Use Node.js 20+ and pnpm 11 (the repository pins `pnpm@11.25.0`). Install and run:

```bash
pnpm install
NEXT_PUBLIC_SUPABASE_ANON_KEY='<your Supabase anon/public key>' pnpm dev
```

The corrected project URL is configured in the app; `NEXT_PUBLIC_SUPABASE_URL` can override it if needed. Configure the anon key through the project's secure environment-variable store. It is a public anon key, not a service-role secret. Never place a service-role key in a `NEXT_PUBLIC_*` variable or browser bundle. The anon key cannot apply SQL DDL.

## Vercel

Import the repository into Vercel, select Next.js, use `pnpm build`, and provide `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the environments where the site runs. Add `NEXT_PUBLIC_SUPABASE_URL` only if overriding the configured URL. Redeploy after changing public build-time variables.

## Privacy and required production changes

**The requested OTP `1234` and `localStorage` admin flag are demo-only, not production authentication.** Anyone can inspect or modify browser storage and call Supabase directly with the anon key. The supplied screenshot showed RLS disabled on `proof_submissions`. Frontend-only hiding cannot protect government-ID images.

Before enabling private owner-document review or privileged production operations:

1. Replace the demo gate with real Supabase Phone Auth (or another approved verified identity flow).
2. Add the missing profile/admin/owner-verification schema additively; do not drop existing tables or infer the meanings of `jobs.phone`, `jobs.owner_id`, or `jobs.is_active` beyond the fields' literal names.
3. Enable restrictive RLS for private verification records and use a private Storage bucket for ID images. Do not store publicly readable government-ID URLs.
4. Review policies for existing jobs, applications and proof records before changing their RLS; other applications may depend on current access.

The unapplied [draft migration](supabase/migrations/20261105084000_uzhaivo_admin_panel.sql) adds nullable job/profile/review metadata, creates `admin_users` and `owner_verifications`, seeds Boss as a super-admin, and creates a new private owner-document bucket with owner/admin policies. It does not migrate unknown data from `user_proofs`, infer job-owner relationships, or alter existing-table RLS. The photo columns must hold private Storage object keys, which the authenticated app must turn into short-lived signed URLs. Review this script before any execution.

The unapplied [platform settings migration](supabase/migrations/20261108090000_uzhaivo_platform_settings.sql) adds the single-row `platform_settings` control document used by the Control Center. Apply it only after the admin authentication/RLS predicate from the first migration is available.

No RLS, schema, or database-row changes have been made. The demo login is still active in the website until the real-auth approach is approved and implemented.
