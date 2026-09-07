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
- **/api (Vercel serverless, plain JS):** invite-info, accept-invite, admin/create-client, admin/delete-client, sign-agreement, party/info, party/upload-url, party/submit, hooks/submission-created. Shared helpers in `api/_lib/`.
- **Review flow:** client submits → trigger writes a `submissions` row → DB webhook → `/api/hooks/submission-created` → Resend email to Arsh. Arsh approves/requests changes on the `submissions` row; DB triggers propagate to the underlying record.
- **Routes:** `/portal/*` (client), `/admin/*` (Arsh), `/join/:token` (invite registration), `/party/:token` (public bridesmaid form), `/privacy`. SPA fallback via `vercel.json` (excludes `/api`).
- **Env:** client vars are `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `SUBMISSION_WEBHOOK_SECRET`, `EMAIL_FROM`, `APP_BASE_URL`, `SUPABASE_URL`) must NEVER get a `VITE_` prefix. Manage with `vercel env`; local `.env.local`.
- **Local dev:** `npx supabase start` (Docker) for the backend, `node scripts/dev-api.mjs` for /api on :3999, `npm run dev` for the SPA (vite proxies /api → :3999). Or `vercel dev`.

## Production ops (learned the hard way)
- `npx supabase config push` **applies even if you answer "n"** at its prompt — treat every run as live. Prod auth URLs / signup policy live in `supabase/config.toml` `[auth]`; push with `--yes` only after editing deliberately. Never set `[auth.email].enable_signup = false` — that disables email *login*, not just signup.
- Deploys: **pushing `main` to GitHub builds production automatically** (Vercel Git integration). Workflow: commit → `npx vercel deploy --yes --archive=tgz` for a preview → verify → `git push origin main`. Never push untested work to `main`. GitHub auth = fine-grained PAT in the Mac keychain (expires 2027-09-07).
- Backups: **automatic** — Vercel cron `/api/cron/backup` every Sunday exports all tables to JSON → private `backups` bucket (last 12) + emails a copy to `app_settings.backup_email`. Manual on-demand: `sh scripts/backup-prod.sh` → `BitCarve-HQ/Backups/`. Neither includes storage photos.
- Auth emails (password reset) go through Resend SMTP from `portal@arshsandhuallure.com`, configured in `supabase/config.toml` `[auth.email.smtp]` with `pass = env(RESEND_API_KEY)` — **export RESEND_API_KEY before `supabase start` or `config push`** or the CLI fails to parse the config. Reset template: `supabase/templates/recovery.html`.
- Keep-alive: Vercel cron hits `/api/cron/keepalive` daily (needs `CRON_SECRET`) so the free Supabase project never pauses.
- Submission emails: pg_net trigger → `/api/hooks/submission-created`; URL + secret in `private_config` (RLS, no policies). If emails stop, check that table and the Vercel function logs first.

## Payments
E-transfer only for now (address in `app_settings.etransfer_email`; Arsh marks received in admin). `payments.stripe_payment_link` is the reserved slot for a future Stripe link — don't build payment processing without Bhagesh.

## PIPEDA
The party form collects third-party personal data: minimal fields only, purpose statement + `/privacy` link above submit, photos in the private bucket via signed URLs only, bride/admin can delete any profile (storage purged), admin hard-delete is the erasure path.
