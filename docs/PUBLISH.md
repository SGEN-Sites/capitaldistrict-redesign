# Publishing record

Repository: https://github.com/SGEN-Sites/capitaldistrict-redesign (public)
Preview: https://sgen-sites.github.io/capitaldistrict-redesign/ (GitHub Pages from the `gh-pages` branch; every page is
`noindex, nofollow` and robots.txt is `Disallow: /`)

## What is public

- `main`: `src/` (including `src/content/capture.json`, the live words the build used, so a clone rebuilds without the
  raw capture), `tools/`, `docs/`, `facts/`, `project.json`, selected evidence in `audit/` and a README.
- `gh-pages`: the preview build, `node src/build.mjs --preview --out dist-preview --base /capitaldistrict-redesign/`.
- Kept out: the raw capture of the live site (`audit/raw`), the downloaded source-site assets (`assets/`), generated
  renders and research (`private/`), the large inventories and the publish scanner.

## Checks run before publishing (2026-11-13)

| check | result | evidence |
|---|---|---|
| every Shop, Specials and category destination (3 stores x 12) shows products, prices and a cart, in a browser | 36/36 | `audit/menu-verification.json` |
| the interactive parts: 21+ gate and store step, store switcher, hero store sleeve, header chip, mega menus, phone drawer, pickup bar (shows past the hero, closes for the session), the record turning, and one H1, no overflow and no script errors on the pages tested | 25/25 | `audit/ui-test.json` |
| every page type rendered at 1440 and 390 px: console errors, sideways overflow, `undefined`/`NaN` text | 0 / 0 / 0 on 40 renders (the lanes also rendered all of their pages: stores 96, shop 20, content and company every page) | render reports |
| no trace of the old platform (`wp-content`, generator meta, plugin classes, dead links) | CLEAN, 0 blockers | `audit/decontamination.json` |
| no API key or credential in any published file | publish scan: the fal key (whole and each half) and credential shapes, every file of both trees | publish scan |
| no reference brand, other client, operator identity or machine path in any text file | publish scan | publish scan |
| the preview stays out of search | every page `noindex, nofollow`; robots.txt `Disallow: /` | publish scan |

## The site-reforge gate (2026-11-13)

**NOT-READY**: 12 PASS, 14 FAIL, 3 UNPROVEN of 29 (`audit/gate.json`, `audit/reports/`). The gate decides whether a
handoff package is ready, and no package was made. The preview is a pitch. The 14 FAILs:

- **C02, C03, C04, C05, C06:** the crawl reached 721 HTML pages and stopped with 319 more queued: the live menu application
  under `/stores/` (a JavaScript app, hundreds of store, brand and product URLs) and the events plugin's endless calendar
  views. Both are deliberately not rebuilt (the menu is linked from every Shop button; each event has its own page). The
  live site's own 404 and 400 answers are recorded and accepted in `audit/failures.json`.
- **C09, C10, C11, C13:** a redesign, by design, does not reproduce the old computed styles, animations or token layer.
  The live site's own keyframes are kept as evidence in `audit/sr-generated-motion.css`; its measured colours and faces
  are the base of the new tokens (`docs/BRAND-SYSTEM.md`).
- **C16:** the not-rebuilt menu and calendar views, each with a REMOVE decision and its reason in the ledger
  (`docs/CHANGE-LOG.md`).
- **C17:** the check compares each live page's whole body (navigation, footer, sliders of other posts) with the rebuild's
  `<main>`. Page content itself survives: home 100% recall, the Albany store page 99.95%; the lanes' own comparison found
  every captured heading, paragraph, list item, FAQ and review on its page.
- **C18:** the redirect stubs for `/albany/`, `/find-a-dispensary/` and the two empty lab-result entries have no H1 or
  description (they forward), and two placeholder meta descriptions were replaced (`docs/PITCH-NOTES.md`).
- **C19:** the preview's forms are switched off on purpose (no `action`); every store phone number is in every page's
  footer, store switcher and pickup bar.
- **C20:** the claims flagged are the client's own published Google reviews, store FAQ answers and blog titles (the
  scanner's text corpus misses the live site's sliders and FAQ panels), plus photo captions. Nothing on the site states a
  fact that is not on the live site or in `facts/client-facts.json`.

UNPROVEN: C12 (no preset library was used), C22 (pixel comparison: a redesign is meant to differ) and C23 (the
breakpoint sweep was not run; the render checks above stand in for it).

## Deploy (2026-11-13)

| step | result |
|---|---|
| repository | `SGEN-Sites/capitaldistrict-redesign`, public; `main` commit 5987caa (source), scanned clean before the push |
| preview | `gh-pages` commit e4a2798; GitHub Pages reported `built e4a2798` about 30 s after the push |
| the live preview | 12/12 pass at https://sgen-sites.github.io/capitaldistrict-redesign/: all 141 pages answer 200 with their own title and `noindex` (15 redirect stubs forward); the CSS, JS, a font and robots.txt answer; on a phone the 21+ gate shows, "Yes, I Am" leads to the store step, picking Clifton Park closes it and points the pickup bar's Shop now, Call and Directions at Clifton Park, the Beverages sleeve opens Clifton Park's Drinks shelf; no script errors (`audit/preview-smoke.json`) |
| the fal key in the public repository | a fresh mirror clone, 934 git objects, every commit searched: 0 hits, whole or in part; no operator identity or machine path |
