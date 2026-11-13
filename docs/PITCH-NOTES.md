# Pitch notes

Redesign concept for capitaldistrictcannabis.com, captured 2026-11-13. Preview only: every page is `noindex`, forms
are switched off, and Shop buttons open the live store menus.

## Kept exactly

- Every content URL of the live site, with its words: the home page, About, Loyalty Program, the three store pages
  (`/location/albany/`, `/location/clifton-park/`, `/location/schenectady/`), the 40 town pages under `/visit-us/`, the
  blog posts and their categories, the 18 event pages, the two brand pages, Brands, Contact, Store Locator, Visit Us,
  Terms & Conditions. Titles and meta descriptions are carried as captured.
- The brand: lime `#a1cf6e`, charcoal `#2a3130`, mint `#dfece7`, Work Sans, the wordmark and the round badge, the
  two-tone stacked headings, the green-toned black-and-white photography, the two-step entry (21+, then store).
- The client's own photos and event flyers, the Google reviews published on the site, the licence numbers and the
  New York warning text, word for word.

## Fixed (defects found on the live site during the capture)

1. **Category and Shop links that land on nothing.** The nav and footer link `/stores/products/flower` (and the same for
   pre-rolls, edibles, vaporizers, concentrates, tinctures, CBD, beverages, accessories), `/stores/specials`,
   `/stores/brands` and `/menu`: all answer **404** to a visitor. The redesign links every category and Shop button to
   the chosen store's own menu (`/stores/<store>/products/<category>`). All 36 destinations (3 stores x Shop all,
   Specials and 10 categories) were opened in a browser on 2026-11-13: each shows products with prices and a cart
   (`audit/menu-verification.json`).
2. **Beverages opens an unfiltered list.** `/stores/<store>/products/beverages` shows "All" products; drinks live on the
   menu's Drinks shelf (`/products/edibles/drinks`). Beverages now opens Drinks.
3. **Topicals was never linked** although every store's menu has it. Added to the nav, footer and category crate.
4. **"Order Ahead" on the 40 town pages** goes to `/shop/`, which redirects to the Albany menu even for towns served by
   Clifton Park or Schenectady. Each town page now orders from its nearest store; `/shop/` is a real Shop page.
5. **Brand pages' Shop Now** links `/stores/brands/ayrloom` (404). Now links each store's brand page.
6. **Placeholder text live on the site:** `/contact/` shows "We'll make some happy little bushes here..." and three
   lorem ipsum FAQ items, and its newsletter block is lorem ipsum. Removed; real store contacts and FAQs in their place.
7. **Empty pages:** `/careers/`, `/find-a-dispensary/` and `/albany/` have no content. Careers has new copy for approval;
   the other two forward to the store locator and the Albany store page.
8. **`/terms-conditions/` contains a Privacy Policy,** not terms. Kept word for word; a real Terms page is a client task.
9. The store pages' `<title>`s are keyword lists of 200 to 300 characters; the 40 town pages have no `<h1>` (their first
   heading is an H2, used as the H1 here). Titles are kept as captured; rewriting them is recommended.
10. The events calendar generates hundreds of thin date and category URLs (522 crawled), several of which answer 404.
11. **Conflicting store details on town pages:** the SUNY Albany page lists 1650 Crane St (Schenectady) under an Albany
    phone and an Albany hero; Glenville shows the Schenectady address with Albany's phone; East Glenville has no address.
    The rebuild follows each page's own hero and address; please confirm the nearest store for each.
12. **Purchase limits are worded two ways:** the store FAQs say "per day ... across all dispensaries combined", the Visit
    Us FAQ says "per transaction, not per location". Both are kept as captured; one should be corrected.
13. Event copy: the BIPOC Pride description says "January 13th" for a June 13 event; the Blaze Za Halls description gives
    zip 12065 for 1650 Crane St (12303). Kept as captured.
14. `/about/` and `/contact/` carried the theme's placeholder meta descriptions ("CannaBuilder 2.0 ... Burlington VT");
    replaced with factual ones.
15. The brand menu holds near-duplicate brand slugs (`mfny` / `mnfy`, `high-falls-canna` / `high-falls-canna-ny`,
    `day-zed` / `dayzed`) worth merging in the menu admin. The Brands page lists 75 brands found on the live menus.

## New page types (new copy for client approval)

Written from facts on the live site only (no prices, deals, statistics or services that are not on the site):
`/shop/`, `/deals/`, `/how-to-order/`, `/pickup/`, `/learn/` (Cannabis 101), `/faq/` (every FAQ answer on the site in
one place), `/reviews/` (every review published on the site), `/sitemap/`, the 404 page, and the Careers copy.

## Questions for the client

1. **Delivery:** the Albany store page says "Dispensary & Delivery" and the Clifton Park and Schenectady FAQs say "Order
   online for pickup and free delivery today." Which stores deliver, where, and on what terms?
2. **Loyalty program:** the page uses only the live wording (points on every purchase, discounts, perks, members-only
   highlights). Points rate, tiers and the sign-up provider would make the page complete.
3. **Hours:** all three stores show Mon to Sat 9 AM to 9 PM and Sun 10 AM to 6 PM, with pre-orders until 30 minutes
   before close. Please confirm before the pitch; hours live in one file (`src/content/site.mjs`).
4. **Photos:** which store is the colour graffiti-mural photo from? Colour photos of Schenectady and the storefronts would
   replace the black-and-white shot and the generated mood images.
5. **"got bud?"**: the sticker on the home page quotes the tee in the store's own photo. OK to use?
6. **Events:** the calendar's latest event is October 30, 2026; nothing upcoming is posted.
7. **Careers:** are roles open, and how should people apply?

## AI imagery

Generated with fal (FLUX1.1 [pro] ultra stills, BiRefNet cut-outs, Kling 2.5 Turbo Pro loops): mood and category
illustration only, never the stores, staff, customers or products. Each file carries IPTC "trainedAlgorithmicMedia" and
`data-ai="generated"`. Three client photos (the skyline, the mural, the Albany counter) were enlarged with Topaz High
Fidelity V2 (no content change) and carry "compositeWithTrainedAlgorithmicMedia". Higgsfield was tried for the loops
and refused for low credit (nothing charged); fal rendered them instead.
