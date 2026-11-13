# Deployment

## Preview

GitHub Pages, repository `SGEN-Sites/capitaldistrict-redesign`, branch `gh-pages`, served at
https://sgen-sites.github.io/capitaldistrict-redesign/. Every page is `noindex, nofollow` and `robots.txt` is
`Disallow: /`.

```bash
node src/build.mjs --preview --out dist-preview --base /capitaldistrict-redesign/
```

## Production

Any static host (Netlify, Cloudflare Pages, S3 + CloudFront, nginx). `node src/build.mjs` writes `dist/` with production
canonicals (`https://capitaldistrictcannabis.com/...`), `robots.txt` and `sitemap.xml`.

**The `/stores/*` path belongs to the live menu and must keep routing to it.** Today one WordPress host serves the content
pages and the headless menu (store pages, categories, specials, cart, checkout) under `/stores/`. Every Shop, Specials and
category button in this build links to `https://capitaldistrictcannabis.com/stores/<store>/...`; keep that route on the
menu application when the content pages move.

## Redirects to add on the production host

| from | to | why |
|---|---|---|
| `/stores/products/<category>` | `/stores/cd-albany-ny/products/<category>` (or the shop page) | old nav links that answer 404 today |
| `/stores/specials` | `/deals/` | 404 today |
| `/stores/brands`, `/stores/brands/<brand>` | `/brands/` | 404 today |
| `/menu/`, `/shop-cbd/` | `/shop/` | 404 today (the build also writes forwarding pages) |
| `/find-a-dispensary/` | `/store-locator/` | empty page today |
| `/albany/` | `/location/albany/` | empty page today |
| `/author/*`, `/blog/page/<n>/`, `/page/<n>/` | `/blog/` | archive and pagination pages |
| `/events/<date>/`, `/events/category/*` | `/events/` | calendar views (hundreds of thin URLs) |

## Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Cache-Control: public, max-age=31536000, immutable   (assets/*: CSS and JS are versioned with ?v=)
```

## Before launch

- Re-check every store's hours in `src/content/site.mjs` (one place for all hours and the pre-order cutoff).
- Connect the sign-up and contact forms to the client's provider (they are switched off in the preview).
- Replace the preview's "Design concept preview" footer line.
