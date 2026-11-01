# UZHAIVO Admin Panel — Implementation Plan

## Product and architecture

Build a responsive admin console using Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, lucide-react, and the existing Supabase project. The browser Supabase client uses the supplied project URL and a protected project environment variable for the public anon key. Existing tables are read/updated/deleted only; no schema changes or drops. Data reads use explicit query fields where privacy matters, realtime listeners update pending review queues, and reusable utilities normalize database records, dates, filters, and errors.

## Project structure

- `app/page.tsx`: demo super-admin login at `/`.
- `app/dashboard/layout.tsx`: client-side localStorage gate, responsive sidebar, pending badges, top bar, and nested dashboard shell.
- `app/dashboard/page.tsx`: exact-count metrics and recent worker/owner activity.
- `app/dashboard/{worker-proofs,owner-verification,jobs,workers,owners,approved,rejected,settings}/page.tsx`: review queues and management screens.
- `components/`: shared navigation, tables, status badges, image/document modals, cards, and small UI helpers.
- `lib/supabase.ts`: browser Supabase client; `lib/admin-data.ts` and `lib/utils.ts`: typed record shapes, safe query helpers, date/label formatting.
- `app/globals.css`, `app/layout.tsx`, `tailwind.config.js`, `postcss.config.js`, `next.config.js`: app shell and style system.
- `public/manus-routes.json`: complete route manifest.
- `README.md`: local setup, environment, Supabase connection, feature map, Vercel notes, and security caveats.

## Design

Three candidates considered: editorial operations console (0.07), warm civic-service dashboard (0.06), and monochrome command center (0.04). Chosen: **warm civic-service dashboard**, based on the supplied palette and UZHAIVO admin requirements.

- **Design Movement:** Contemporary civic-service SaaS, balancing approachable public-service warmth with precise operational controls.
- **Core Principles:** Clear hierarchy for high-volume review; orange signals action without overpowering; blue distinguishes the sensitive owner-verification workflow; all important controls work on touch screens.
- **Color Philosophy:** The specified orange and cream create a friendly, recognizable identity; near-black text preserves contrast; green/red/blue are reserved for status and the private verification domain.
- **Layout Paradigm:** Persistent rail on desktop with an adaptive drawer on mobile; broad content canvas prioritizes queue cards and horizontally scrollable data tables over decorative structure.
- **Signature Elements:** A compact orange U-mark; subtle orange edge accents on action cards; a blue, lock-marked private owner review surface.
- **Interaction Philosophy:** Immediate, explicit approval/rejection actions, confirmation for destructive operations, clear loading/empty/error states, and direct phone-call links.
- **Animation:** Restrained 150–200ms color/shadow transitions, a gentle pulse on live pending indicators, and short modal/drawer fades; respect reduced-motion settings.
- **Typography System:** Inter-style sans-serif for compact, legible administration; 30px page titles, 18–20px card headings, 14px body copy, and 12px metadata.
- **Brand Essence:** A warm, direct control room for UZHAIVO’s super administrator; personality: dependable, alert, approachable.
- **Brand Voice:** Short, operational, and respectful. Examples: “Review the proof before approving the job.” “Private owner documents stay in this admin review.”
- **Wordmark & Logo:** Distinct orange rounded-square U monogram paired with a bold UZHAIVO wordmark.
- **Signature Brand Color:** UZHAIVO Orange `#FF8C42`.

## Material constraints

The requested login is a demo gate (phone + OTP `1234`) backed by browser `localStorage`, not secure authentication. The Supabase anon key is public by design, and a client-only gate cannot enforce admin access. Owner ID image privacy cannot be guaranteed if the existing project exposes rows through permissive RLS. Document this clearly and do not fetch `gov_id_url` in general worker/owner listings. No database writes are performed as part of development; operational updates occur only after an administrator presses an action in the running site.
