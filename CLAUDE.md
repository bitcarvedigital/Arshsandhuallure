# Arsh Sandhu Allure — arshsandhuallure.com

Luxury bridal hair & makeup artist (GTA). This repo is her live marketing site
PLUS the client/admin portal. Built and maintained by BitCarve Digital.

## Brand (THIS client's brand — never BitCarve's palette)
- Colors (tailwind.config.js): `beige #F5EFEA` (bg) · `beige-dark #EDE3DB` · `beige-card #EAE0D6` · `gold #7A5A32` (accents ONLY — hairlines, micro-labels, diamond motifs; never large fills) · `dark #1A1A1A` · `btn-dark #2B2521`
- Fonts: `font-heading` = Playfair Display (all headings/wordmark) · `font-body` = Inter (Google Fonts in index.html)
- Motifs: rotated-diamond bullets, gold hairline rules, uppercase micro-labels with `tracking-[0.2em]`+, underline-style form inputs (copy the `fieldClass`/`labelClass` pattern in `src/pages/BookingPage.jsx`), framer-motion fade-ups `ease: [0.22, 1, 0.36, 1]`
- Tagline: "Where Elegance Meets Artistry." Voice to clients: warm, polished, premium.

## Hard rules
1. Plain JavaScript/JSX only — no TypeScript, no new frameworks. This is a Vite 5 + React 18 SPA (react-router v7), NOT Next.js — ignore any tooling suggestion that assumes Next.js.
2. Marketing surface is FROZEN: `/`, `/about`, `/book` (Formspree form), `/services`, `/reviews` and their components. Don't restyle, don't refactor, don't import portal code into them.
3. Portal code lives in lazy chunks (`src/portal`, `src/admin`, `src/party`, `src/shared`, `src/lib`). supabase-js must never appear in the marketing index chunk — verify with `npm run build` + grep.
4. Mobile-first: brides fill everything on phones (design at 390px first).
5. Every non-marketing route sets `<meta name="robots" content="noindex">`.
6. Deploys to production require Bhagesh's explicit approval (BitCarve HQ gate).

## Architecture
- **Backend:** Supabase (auth email/password, Postgres + RLS, private storage bucket `client-uploads`). Two projects: dev + prod. Schema lives in `supabase/migrations/*.sql` — schema changes = NEW numbered migration file, never edit an applied one.
- **RLS doctrine:** default-deny everywhere; sensitive data (admin notes, difficulty flags) on admin-only tables; token tables have no anon/client write policies — all public flows (party link, invites) go through `/api` with the service role. Adversarial probe: `scripts/rls-probe.mjs`.
- **/api (Vercel serverless, plain JS):** invite-info, accept-invite, admin/create-client, admin/delete-client, invoice (send / resend / preview / download), sign-agreement, party/info, party/upload-url, party/submit, hooks/submission-created, cron/keepalive, cron/backup. Shared helpers in `api/_lib/`.
- **Test emails really send** (Bhagesh, 2026-09-25): local `.env.local` carries the real `RESEND_API_KEY` + `EMAIL_FROM=portal@arshsandhuallure.com`, and `notification_email` stays Arsh's. Test brides use deliverable plus-addresses (bhanumalhi+…@gmail.com).
- **Review flow:** client submits → trigger writes a `submissions` row → DB webhook → `/api/hooks/submission-created` → Resend email to Arsh. Arsh approves/requests changes on the `submissions` row; DB triggers propagate to the underlying record.
- **Routes:** `/portal/*` (client), `/admin/*` (Arsh), `/join/:token` (invite registration), `/party/:token` (public bridesmaid form), `/privacy`. SPA fallback via `vercel.json` (excludes `/api`).
- **Logins never cross over (2026-09-25):** the client login only accepts client accounts and the studio login only studio accounts — a wrong-kind account gets an error and is signed straight out (`resolveRole` in `src/portal/AuthProvider.jsx`). Guards send a wrong-role session to *that* portal's login with a notice. Studio resets use `/admin/reset`.

## Bookings (multi-event, migration 7 — 2026-09-25)
- A booking = `events` (Mehndi, Jaggo, Wedding…) + `event_line_items` per event (kind `service` | `fee` | `discount`; services carry `service` hair/makeup/both, `for_bride`, default `minutes`). Studio saves go through the **`admin_save_booking(client, events jsonb)` RPC** (one transaction, stable ids so timelines survive).
- **The flat event/amount columns on `clients` are DERIVED** by `refresh_client_booking()` (triggers on events, lines, payments): earliest event date, names joined, totals, 30% retainer (or the received retainer), balance. Never write them directly — change lines/events instead. They exist so older readers (list sort, emails, party link) keep working.
- `guard_client_update` is an ALLOWLIST (clients may change phone + email only) — new `clients` columns are protected automatically.
- Payments = retainer + final (one each) + any number of received `installment` rows (label, event, method). Final balance = total − retainer − installments.
- Per-event timelines in `event_timelines` (content = chairs + bricks; times are computed, never typed — `src/shared/booking/timeline.js`). Clients only see `visible` ones; publishing keeps the journey's `timeline` doc in step.
- Invoices: `invoices` (number `ASA-YYYY-NNNN` by trigger, frozen `snapshot`, `issued`|`void`). `api/invoice.js` (actions send / resend / preview / download) renders the PDF (`api/_lib/invoicePdf.js`, pdfkit, fonts in `api/_assets/fonts/` bundled via `vercel.json` `includeFiles`), emails it with a copy + reply-to Arsh, and serves downloads (studio, or the owning client for issued invoices).
- **Vercel Hobby plan = max 12 serverless functions per deployment — the portal is AT 12.** Any new endpoint must join an existing file (action param) or the deploy fails.
- Price list = `app_settings.price_list` (JSON, studio-only), edited in Settings.
- **Shared pure modules** in `src/shared/booking/*.js` (`pricing`, `services`, `timeline`, `intake`) are imported by BOTH the browser and `/api` — keep them pure: no JSX, no `import.meta.env`, no browser globals, explicit `.js` extensions.
- Intake payload schema 2: `{profile, events[], _autofill}`; party_members get `autofill` + `event_ids`. Auto-filled fields stay highlighted until the person clicks them ('new' → after Save 'saved' → removed on click). Profile questions follow the chosen service (hair-only never sees skin questions and vice versa) — enforced in the form AND server-side (`stripIrrelevant`).
- Photo consent (terms v1 §7, `agreements.photo_consent`) is deliberately unchanged. Signed agreements render the terms version they were signed under.
- Page layout rule: every long form = `FormSection` (small gold subheading → questions underneath), one column, top to bottom.
- Checks: `scripts/booking-invariants.sql` (runs in a rolled-back transaction) + `scripts/rls-probe.mjs` (53 checks) must both pass before a deploy.
- **Env:** client vars are `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `SUBMISSION_WEBHOOK_SECRET`, `EMAIL_FROM`, `APP_BASE_URL`, `SUPABASE_URL`) must NEVER get a `VITE_` prefix. Manage with `vercel env`; local `.env.local`.
- **Local dev:** `npx supabase start` (Docker) for the backend, `node scripts/dev-api.mjs` for /api on :3999, `npm run dev` for the SPA (vite proxies /api → :3999). Or `vercel dev`.

## Production ops (learned the hard way)
- `npx supabase config push` **applies even if you answer "n"** at its prompt — treat every run as live. Prod auth URLs / signup policy live in `supabase/config.toml` `[auth]`; push with `--yes` only after editing deliberately. Never set `[auth.email].enable_signup = false` — that disables email *login*, not just signup.
- Deploys: **pushing `main` to GitHub builds production automatically** (Vercel Git integration). Workflow: commit → `npx vercel deploy --yes --archive=tgz` for a preview → verify → `git push origin main`. Never push untested work to `main`. GitHub auth = fine-grained PAT in the Mac keychain (expires 2027-09-07).
- Backups: **automatic** — Vercel cron `/api/cron/backup` every Sunday exports all tables to JSON → private `backups` bucket (last 12) + emails a copy to `app_settings.backup_email`. Manual on-demand: `sh scripts/backup-prod.sh` → `BitCarve-HQ/Backups/`. Neither includes storage photos.
- Auth emails (password reset) go through Resend SMTP from `portal@arshsandhuallure.com`, configured in `supabase/config.toml` `[auth.email.smtp]` with `pass = env(RESEND_API_KEY)` — **export RESEND_API_KEY before `supabase start` or `config push`** or the CLI fails to parse the config. Reset template: `supabase/templates/recovery.html`.
- Keep-alive: Vercel cron hits `/api/cron/keepalive` daily (needs `CRON_SECRET`) so the free Supabase project never pauses.
- Submission emails: pg_net trigger → `/api/hooks/submission-created`; URL + secret in `private_config` (RLS, no policies). If emails stop, check that table and the Vercel function logs first.

## Portal look (Bhagesh, 2026-09-26 — "D with C's soft corners")
- **No outlined boxes.** Lists are rows split by thin lines (`rowLine` + `rowLink`); the few things that need a surface get a soft cream panel (`softPanel` = `rounded-2xl bg-surface`); notes `softNote`; empty states `emptyNote`; labels are soft rounded `Pill` / `StatusChip`; buttons are rounded pills (`Btn`, `size="sm"` for small; a Link styled as a button uses `btnClass()` — never wrap a `<button>` in a `<Link>`).
- **Colour tokens only** (tailwind.config.js): `text-dark` · `text-body` · `text-muted` · `text-faint` · `text-ghost` (locked only) · `border-line` · `bg-surface` · `bg-soft` · `text-danger` · `text-success`. Don't add new hex greys. Gold stays an accent (never a large fill; selected states are `bg-dark`).
- Page header: MicroLabel eyebrow → `h1 font-heading text-3xl` → one-line `text-sm text-muted` intro. Timestamps use `fmtDateTime`.
- The bride's home page = one "next step" panel with a single button + a quiet progress list.
- Only big things fold: each event on the studio Overview (`useSectionOpen`, remembered per browser tab; "Open/Close events"). Small sections never collapse.
- **Strictly minimal: no diamond motifs, ornaments or decorative dividers anywhere in the portal** (Bhagesh, 2026-09-26) — numbers are plain numbers, bullets are tiny round dots at most, dividers are plain `bg-line` hairlines only when needed. (The marketing site keeps its own motifs.)
- Keyboard focus ring: `.portal-ui` class on every portal page root (src/index.css).
- Design changes are shown to Bhagesh as screenshot options first and applied after he approves.

## Payments
E-transfer only for now (address in `app_settings.etransfer_email`; Arsh marks received in admin). `payments.stripe_payment_link` is the reserved slot for a future Stripe link — don't build payment processing without Bhagesh.

## PIPEDA
The party form collects third-party personal data: minimal fields only, purpose statement + `/privacy` link above submit, photos in the private bucket via signed URLs only, bride/admin can delete any profile (storage purged), admin hard-delete is the erasure path.
