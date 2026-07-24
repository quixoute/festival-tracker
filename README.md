# Call Sheet — Festival Submission Tracker

Source for the "Call Sheet" dashboard: a compiled tracker of film-festival
and script-competition submission deadlines, fees, and requirements across
international A-list, international genre/regional, Indian, AI-generated,
and script-only (screenplay competitions, no film required) categories.

Published artifact: https://claude.ai/code/artifact/58845195-bbf5-4850-bbaf-4deba4bc095f

## Structure

- `src/data.js` — the `FESTIVALS` array, `CATS` category map, and `FORMATS`
  map (`live-action` / `animated` / `mixed`). This is where research updates
  go: deadlines, fees, formats, required documents, status overrides
  (`tba` / `hiatus` / `curated`), notes. Each entry also carries `feeAmount` +
  `feeCurrency` (a single representative numeric fee, or `null` if genuinely
  unconfirmed) so the shortlist feature can total fees per currency — don't
  guess a number just to fill the field; leave it `null` if unconfirmed.
- `src/logic.js` — render logic: status computation (open / closing soon /
  closed / TBA / inactive, based on `deadlineISO` vs. today), filters
  (category / status / format), search, sort, card rendering, and the
  localStorage-backed shortlist (star any entry, see a running fee total
  grouped by currency).
- `src/logic.js` — render logic: status computation (open / closing soon /
  closed / TBA / inactive, based on `deadlineISO` vs. today), filters, search,
  sort, card rendering.
- `src/template.html` — page shell: fonts (Bebas Neue + Archivo, inlined as
  base64 `@font-face`), CSS design tokens (light/dark theme), header, controls,
  footer. Contains `__ARCHIVO_B64__`, `__BEBAS_B64__`, `__DATA_SCRIPT__`
  placeholders.
- `src/fonts/*.b64` — pre-fetched, base64-encoded woff2 font files (Archivo
  variable font + Bebas Neue), checked in so builds don't need network access.
- `build.py` — splices template + fonts + data + logic into `dist/festival_dashboard.html`.
- `dist/festival_dashboard.html` — the built, self-contained file that gets
  published as the Artifact.

## Rebuilding

```
python3 build.py
```

Then republish `dist/festival_dashboard.html` via the Artifact tool, passing
`url` set to the URL above so it updates in place instead of minting a new one.

## Weekly refresh

A Routine re-verifies festival data weekly (see the "Call Sheet Weekly
Refresh" trigger) — it prioritizes re-checking festivals marked TBA/closed for
newly announced dates, rather than re-researching everything from scratch.
Each week's changes should land as a commit to `src/data.js` so the git
history doubles as a changelog.
