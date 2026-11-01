# UZHAIVO Admin Panel — Delivery Checklist

## Demo login and shared dashboard shell
- [x] The login page fills the screen with a gradient from `#FF8C42` to `#FF6B35` and centers a rounded white card with the UZHAIVO wordmark and the subtitle “Admin Panel - Only for 9025421145”.
- [x] The form has a required phone input defaulting to `+919025421145` and a required OTP input; accepted super-admin phone formats normalize spaces and plus signs; phone `9025421145` with OTP `1234` stores `isAdmin`, `adminPhone=9025421145`, and `role=super_admin` in localStorage, then routes to `/dashboard`; unauthorized input shows the specified denial and failed login guidance. Show the demo OTP notice and Tamil login label.
- [x] The dashboard layout checks `isAdmin`, redirects unauthenticated visitors to `/`, uses a fixed 280px desktop sidebar and a mobile drawer/overlay, shows the UZHAIVO/admin identity and Super Admin indicator, and provides Overview, Worker Proofs Pending, Owner Verification (Any 2 Docs, PRIVATE), All Jobs, All Workers, All Owners + Blue Tick, Approved, Rejected, Settings, and logout.
- [x] Sidebar worker pending badges count submitted proof submissions, falling back to pending job applications only when no proof submissions exist; owner pending badges query pending owner verifications. The sticky topbar provides search, pending notification count, and Boss avatar; logout clears localStorage and returns to `/`.

## Overview and worker proof moderation
- [x] The Overview welcomes Boss at 9025421145 and shows eight parallel exact-count Supabase statistics: jobs, pending worker proofs (submitted proof count or pending-application fallback), pending owner verifications, workers, owners, verified owners, approved jobs, and applications. It lists up to five newest submitted worker proof submissions with job title and up to five pending owner verifications; refreshes every 10 seconds.
- [x] Worker Proofs loads submitted `proof_submissions` with joined job details, falling back to pending `job_applications` if the submitted-proof queue is empty; includes text search, Aadhaar/license filter, refresh, loading skeleton, realtime INSERT subscription, pending cards, worker/owner call links, job details, proof images and image zoom/download/action modal.
- [x] Approving a proof updates the proof submission to `approved`, its matching application to `approved` with `updated_at`, and the job to `approved`; rejecting asks for a reason and updates the proof to `rejected`. Application fallback records are moderated through `job_applications`. The page has the specified all-clear state.

## Private owner verification
- [x] Owner Verification labels the queue PRIVATE and explains that only Admin 9025421145 and the owner should see the photos; workers must not receive government ID images. A verification requires any two distinct document types from Aadhaar, Voter ID, and Driving License, with front and back for each (four images total).
- [x] The queue loads pending owner verifications newest-first, supports owner phone/name search, Aadhaar/Voter ID/License document filters, refresh, realtime INSERT subscription, loading and empty states, owner call link and `verified_by` label.
- [x] Each verification displays both document types and all four front/back images, has click-to-zoom, four-photo modal, download links, approve/reject controls, and an explicit private-data warning.
- [x] Approve updates the owner verification status, timestamp, and `verified_by=9025421145`, then sets the owner profile `is_verified_owner`, `blue_tick`, and `verified` to true. Reject asks for a reason and stores `rejection_reason`. Never fetch `gov_id_url` in general worker/owner list queries.

## Management, status history, and settings
- [x] Jobs provides searchable/filterable rows with title, location, salary, category, owner phone, proof requirements, status and creation date; View opens job details, Ban rejects a job, and Delete requires confirmation before deletion.
- [x] Workers shows name, phone, verified status, rating, completed jobs and join date; the admin can inspect that worker’s proof submissions and confirm before removing/banning a profile.
- [x] Owners shows name, phone, Blue Tick verification status, posted-job count and join date; the private government-ID view opens owner verification images only from the admin view, and admin controls can remove the blue tick or confirm owner removal.
- [x] Approved presents separate worker proof/application and owner-verification records with approval date and verifier where timestamps are present; it labels missing proof decision times when the schema has no timestamp column. Rejected presents both categories with rejection date/reason where the schema provides it, and labels unavailable decision times rather than showing submission time as decision time.
- [x] Settings identifies super admin 9025421145 / `super_admin`, allows adding `moderator` and `super_admin` records, lists admin users and allows removing other admins; describe the danger zone.

## Project setup, privacy, and responsive delivery
- [x] The app uses Next.js 14 App Router, TypeScript, Tailwind CSS only (no component library), `@supabase/supabase-js`, and lucide-react; includes app layout/global styles, Tailwind/PostCSS/Next config, and all page routes.
- [x] Configure the supplied Supabase URL and secure project variable `NEXT_PUBLIC_SUPABASE_ANON_KEY`; use only existing tables and never drop/alter schema. Include setup/Vercel instructions and the requested feature list in README.
- [x] Match the requested palette (`#FF8C42`, `#1A1A1A`, `#FFF7ED`, white, `#10B981`, `#F59E0B`, `#EF4444`, `#3B82F6`), rounded-2xl cards, subtle shadows, Sans typography and Tamil support. Make navigation a mobile drawer, stack cards on small screens and keep tables horizontally scrollable.
- [x] Explain that localStorage + a public anon key is a demo-only login and not production authorization; warn that private document access requires restrictive Supabase RLS and must not be exposed by permissive policies.
