# Portal pitch deck generator

Regenerates `docs/Client-Portal-Proposal.pdf`, a generic sales deck for the
client & studio portal. Every screen is captured from the real portal code
running against a mocked Supabase backend with demo data, and every mention of
the real studio is swapped for a placeholder brand (`brand.mjs`), so the PDF
can be sent to anyone. Nothing here touches production.

| File | What it does |
| --- | --- |
| `brand.mjs` | The placeholder studio and the text swaps applied everywhere |
| `fixtures.mjs` | Demo bride with three events, party, payments, invoice; totals and timelines come from `src/shared/booking/*` |
| `mock.mjs` | Network mock for PostgREST, auth, storage and `/api` |
| `shoot.mjs` | Screenshots every client, party, studio and phone screen into `.pitch/shots/` |
| `emails.mjs` | Renders the invite, alert and invoice emails |
| `pdfs.mjs` | Renders the real invoice and timeline PDFs (`api/_lib/*Pdf.js`) and rasterises them with pdf.js |
| `build-pdf.mjs` | Lays out the deck (copy lives here) and prints it to PDF |

```sh
npm install
npm i --no-save playwright-core pdfjs-dist      # tools only, not project dependencies
VITE_SUPABASE_URL=http://mock.supabase VITE_SUPABASE_ANON_KEY=demo \
  npx vite --port 5173 --host 127.0.0.1 &        # the SPA against the mock
cd scripts/pitch
node shoot.mjs        # ~10 min; `node shoot.mjs admin` re-shoots only matching names
node emails.mjs
node pdfs.mjs
node build-pdf.mjs    # also writes page previews to .pitch/pdfpages/ and reports overflow
```

Chromium is expected at `/opt/pw-browsers/chromium` (override with
`CHROMIUM_PATH`). The deck uses Instrument Serif and Inter: put a
`@font-face` stylesheet at `.pitch/fonts/local.css` for offline rendering,
otherwise it imports them from Google Fonts.

When the portal changes, update `fixtures.mjs` for new tables or fields, the
flows in `shoot.mjs` for new screens, and the page copy in `build-pdf.mjs`.
