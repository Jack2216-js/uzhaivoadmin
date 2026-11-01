# UZHAIVO Admin Panel

Responsive super-admin dashboard built with Next.js App Router, React 18, TypeScript, Tailwind CSS, lucide-react, and Supabase JS. The package manifest retains the requested Next.js 14.2 line and pins the latest patched 14.2.35 release instead of the vulnerable 14.2.0 patch.

## Features

- Demo admin login for `9025421145` / `+919025421145` with OTP `1234`.
- Overview dashboard with eight live metrics, recent proof and private owner-verification queues, plus 10-second refresh.
- Worker proof review with joined job information, Aadhaar/license filters, image inspection/download, realtime updates, approve/reject, and phone links.
- Private owner verification review: any two different IDs among Aadhaar, Voter ID and Driving License, with front and back photos for each (four images); blue-tick approval, rejection reason, image view/download and realtime updates.
- Searchable job, worker and owner directories; status history for approved/rejected records; admin-user settings.
- Mobile navigation drawer, responsive cards, horizontally scrollable tables, and English/Tamil labels.

## Local setup

Use Node.js 20+ and pnpm 11 (the repository pins `pnpm@11.25.0`). Install and run:

```bash
pnpm install
NEXT_PUBLIC_SUPABASE_URL=https://cbijbcebpjkkgfwhqjho.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY='<your Supabase anon/public key>' pnpm dev
```

Configure `NEXT_PUBLIC_SUPABASE_ANON_KEY` via the project’s secure environment-variable store for deployed builds. The key is a public anon key, not a service-role secret. Do not place a service-role key in any `NEXT_PUBLIC_*` variable or browser bundle. The existing Supabase tables are used as provided; this website does not create, drop or alter database tables.

## Vercel

Import the repository into Vercel, select Next.js, set the build command to `pnpm build`, and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the environments in which the site will run. Redeploy after changing build-time public variables. No service-role key is needed or accepted by the browser client.

## Existing data and privacy requirements

The dashboard expects the supplied `jobs`, `job_applications`, `proof_submissions`, `profiles`, `admin_users`, and `owner_verifications` tables and the listed columns. The owners and workers directories deliberately do not select `gov_id_url` or `verification_docs`. Owner government-ID images are loaded only inside the private administrator review screens; approved/rejected history shows only document types and status metadata.

**Security limitation: the requested OTP `1234` and `localStorage` admin flag are a demo-only client-side gate, not production authentication.** Anyone can inspect or modify browser storage and call Supabase directly with the public anon key. The user-provided brief also states that permissive “allow all” RLS policies exist. If those policies allow anon access to `owner_verifications`, frontend-only hiding cannot keep ID photos private. Before production, replace the demo login with server-verified authentication, enforce admin-only RLS for every sensitive table and storage object, restrict workers to their own permitted records, and audit storage URLs. Do not deploy private ID images under policies that grant public/anon reads. This app does not claim to repair or override the existing RLS configuration.

## Data changes

Dashboard pages issue Supabase selects. Approve/reject, delete, ban-as-reject, blue-tick changes, admin creation and admin deletion write to existing rows only after an administrator explicitly presses an action. Confirm dialogs guard destructive deletes/removals. The worker `proof_submissions` schema has no `rejection_reason` column, so worker rejection reasons are collected for the action but cannot be persisted in that table; owner rejection reasons are stored as the provided schema supports.

Worker proof records contain a submission `created_at` field but no `approved_at` or `rejected_at`; worker application fallback records include `updated_at`. The history views do not mislabel proof submission time as decision time and show when the decision timestamp is unavailable in the existing schema. Owner approvals show the provided `verified_at`; owner rejections have no dedicated decision-time field in the supplied schema, so the UI marks it unavailable.
