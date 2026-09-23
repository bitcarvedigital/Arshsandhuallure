# Portal pitch deck generator

Regenerates `docs/Client-Portal-Proposal-Kristen.pdf` from the live portal code
using a mocked Supabase backend (no Docker, no credentials, demo data only).

```sh
npm install                                   # project deps (sharp is used for placeholders)
npm i --no-save playwright-core               # not a project dependency
VITE_SUPABASE_URL=http://mock.supabase VITE_SUPABASE_ANON_KEY=demo npx vite --port 5173 &
cd scripts/pitch
node shoot.mjs      # screenshots every client/party/admin page → .pitch/shots
node emails.mjs     # renders the invite + alert emails
node build-pdf.mjs  # assembles the PDF (edit the copy/add-ons in this file)
```

`shoot.mjs` and `build-pdf.mjs` expect Chromium at `/opt/pw-browsers/chromium`
(Playwright's default install location); change `executablePath` if yours differs.
Fonts are downloaded once into `.pitch/fonts/` by hand (see `build-pdf.mjs`), or swap the
`@font-face` block for a Google Fonts `@import` when you have network access.
