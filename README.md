# Capital District Cannabis & Wellness: website redesign concept

A complete redesign concept for [capitaldistrictcannabis.com](https://capitaldistrictcannabis.com), prepared for
Capital District Cannabis & Wellness (Albany, Clifton Park and Schenectady, New York). **This is a pitch preview, not
the live site.**

**Preview:** https://sgen-sites.github.io/capitaldistrict-redesign/ (noindex). Every Shop and category button opens
the live store menu with its products and cart.

## What is in it

- 161 HTML files: every live content page at its live URL (the blog posts and event pages word for word, the
  three store pages, the 40 town pages, loyalty, about, terms), plus new page types: Shop, Deals, How to Order, Pickup,
  Learn (Cannabis 101), FAQ, Reviews and an HTML site map.
- "Capital Cypher": the Albany skyline after dark, a graffiti hall of fame behind museum glass and a record that never
  stops spinning, in the brand's own lime and charcoal (see `docs/DESIGN.md`).
- Pick **Albany**, **Clifton Park** or **Schenectady** anywhere (21+ gate, header chip, hero sleeve, sticky pickup bar);
  every Shop, Specials and category button then opens that store's live menu, with live open/closed and pre-order status.
- Every visible fact traces to the live site (`src/content/capture.json`) or to `src/content/site.mjs`, which names
  its source for each value. New pages are written from those facts only and are listed in `docs/PITCH-NOTES.md`.

## Build

Node 18+ and nothing else: no framework, no dependencies.

```bash
node src/build.mjs                                                                  # dist/ (production URLs)
node src/build.mjs --preview --out dist-preview --base /capitaldistrict-redesign/   # the Pages preview (noindex)
```

## Verification on record

| check | result | evidence |
|---|---|---|
| every Shop, Specials and category destination (3 stores x 12) shows products, prices and a cart | 36/36 pass | `audit/menu-verification.json` |
| site-reforge gate | 12 pass, 14 fail, 3 unproven | `audit/gate.json`, `docs/PUBLISH.md` |
| the live preview: pages answer 200 with noindex; gate, store switch and pickup bar work | 12/12 pass | `audit/preview-smoke.json` |

## Imagery and marks

20 images are AI-generated mood and category illustrations (no people, no products, no real places): each carries
`data-ai="generated"` on the page and IPTC "trainedAlgorithmicMedia" in its metadata. 3 client photos were
enlarged with an AI upscaler (no content change) and carry "compositeWithTrainedAlgorithmicMedia". Everything else is
the client's own photography and flyers. `src/content/images.json` records each image's source. The Capital District
Cannabis & Wellness names, marks, photography and copy belong to Capital District Cannabis & Wellness.
