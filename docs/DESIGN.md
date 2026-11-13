# Design: "Capital Cypher"

**The Albany skyline after dark, a graffiti hall of fame behind museum glass, and a record that never stops spinning.**

Capital District Cannabis & Wellness looks one way in its stores and another way online. Inside, the walls carry
graffiti murals, "got bud?" tees show up at the counter and hip-hop runs through the events (car meets, boat parties,
pop-ups, an artist's exclusive drop). The website was tidy and corporate. This redesign closes that gap: the street culture of the
stores, carried with the polish of a licensed, three-store operator.

A cypher is the circle where everyone gets a turn. The client's own headline is "Unifying Upstate", so the circle is the
motif: the record, the round badge logo, the store bullets, the three stores as one crew.

## Brand system (measured, then extended)

| token | value | source |
|---|---|---|
| lime | `#a1cf6e` | live site `--Primary` |
| charcoal | `#2a3130` | live site `--Base-Black` |
| deep green-black | `#1f2926` | live site `--Accent-1` |
| slate | `#404a49` | live site surface |
| mint | `#dfece7` | live site `--colors-neutral` |
| night | `#141a19` | derived: the deepest ground |

- **Display:** Anybody, a variable face (width 50 to 150, weight 100 to 900), set very wide and heavy in uppercase. It is
  the open stand-in for the live site's Adobe "scale-variable" face, and its width axis is animated: headings stretch
  open as they arrive.
- **Body and interface:** Work Sans, the live site's own body face.
- **Tag hand:** Sedgwick Ave Display, a graffiti hand. One tagged word or sticker per section at most.
- **Two-tone stacked headings** (white line, lime line) are kept from the live site, where they are its signature.
- **Black-and-white photography toned green** is kept from the live site (the skyline and store photos); real colour
  photos of the stores stay in colour.

## Three planes

1. **Back plane: bands.** Each section is a band on a dark ground with ONE key light (a lime radial pool, positioned per
   section and following the pointer on desktop), a raking beam, a vignette and film grain. One "lights on" mint band per
   page breaks the night.
2. **Mid plane: glass.** Frosted glass only where something varied sits behind it: the header, the store sleeve over the
   skyline, the store switcher, the pickup bar, the story plate over the mural wall.
3. **Front plane: depth objects.** Cut-outs cross section seams with parallax: a spray can, a bud, a boombox. The record
   in the hero crosses the seam into the next section. The tapes cross over it.

## Signature moments

- **The record** (home hero, FAQ, footer, 404): CSS-built vinyl with the client's round badge as its label. It turns at
  33 1/3 rpm, scrolling nudges it faster, and it can be scratched with the pointer or a finger.
- **The sleeve:** the glass card the record slides out of is the store picker. "Now spinning at Albany", live open and
  pre-order status, one tap to switch stores.
- **The crate:** shop by category as record sleeves. Hover lifts a sleeve and the record slides out; every sleeve opens
  that category on the live menu of the chosen store, with products and a cart.
- **The skyline after dark:** the client's own Albany skyline photo, toned lime, with searchlight beams sweeping the sky
  and the river reflection rippling.
- **The hall of fame:** the store's real mural photo framed under museum glass, a black-and-white collage taped beside
  it, and behind them a dark wall that lights up wherever the pointer goes (it drifts on its own on touch screens).
- **Crossing tapes:** the live site's marquee, rebuilt as two crossing tapes carrying the client's own phrases. Scrolling
  speeds them up.
- **Street flyers:** specials and events are flyers taped to the wall; the event flyers are the client's real ones.
- **Shout-outs:** reviews as die-cut speech bubbles.
- **Paint drips:** the lime sign-up band drips into the footer.

## Motion rules

Reveals fade up and come into focus; display headings stretch open on the width axis; one easing curve for almost
everything. All motion is off under `prefers-reduced-motion`; every page is complete without JavaScript (links default to
the Albany menu). Pointer effects (tilt, magnetic buttons, the key light, the flashlight) only run on fine pointers.
Loops load near view, pause off screen and never load under reduced motion or Save-Data.

## Information architecture

The live site's URLs are all kept. The chrome adopts the pattern of large multi-location retailers: a utility line with
the store and its live status, a header with mega menus (Shop, Locations, Learn) and a store chip, a store switcher, a
phone drawer, a sticky pickup bar, and a footer with every store, the areas served, the licences and the New York
warning. New page types fill the gaps a multi-store dispensary needs: Shop, Deals, How to Order, Pickup, Learn, FAQ,
Reviews and a site map.

## Design language, as the owner shaped it (2026-11-13)

The rules every page follows. Reviewers check each inner page against this list at desktop (1440, 1024) and on
phones (390, 360).

**Layout**
- Compact and even. Two columns end level, with no tall empty area beside a shorter column. Media stretches to the
  words beside it (store "at a glance") or the words column widens (home Our Purpose).
- Headings fit their column. Use the `md` display size in two-column rows, never 4+ lines. A two-line heading that
  leaves the row's right side empty becomes one line (home Shop by Category).
- No dead padding. A section stands about as tall as its content needs.
- Text sizes to the space it is given (container units). No overflow, no cramped columns (under ~14 characters a
  line), no lone short word on a last line ("AM", "NY" are kept together with no-break spaces), and no button label
  on two lines. `tools/text-overflow-audit.mjs` enforces all of these.
- CTAs on phones and tablets match in size and use the full width ("CTAs should match sizes and should utilize full
  width for mobile views and tablet"). Up to 1024 px a button group's buttons share its width in equal columns. Phones
  (under 600 px) get one button per row. Tablets get one row when every label fits on one line, otherwise one per row
  (four buttons: two by two). The groups are listed in `src/styles/fix.css` and `src/scripts/ctas.js`, and checked by
  `private/cta-check.mjs`. A new button group goes on that list.

**Shared components (reuse, don't reinvent)**
- Specials per store: the store tickets (`sp-b` / `sp-tix`, sp.css).
- Featured reviews: the Deck (`rv-c`, rv.css; site.js `[data-rv-deck]`).
- FAQs: the home FAQ layout. A sticky heading column with a short lede and the spinning record, beside the accordion.
- Event posters: the gradient carousel (`gcar`). The posters' majority colour tints the band.
- Categories on location pages: the concave cave carousel. The home page and /shop keep the record crate.
- Store cards: `mini` (footer, modal) and `scard`. Equal heights, CTAs aligned, names on one line.
- Page-hero sticker: elastic, pinned after the H1's last letter.
- Sign Up & Save on every page: The Pass.

**Seams and objects**
- Section dividers come from the build (dividers.mjs):
  - into a light band, the wheat-paste tear;
  - into or out of deals, the neon cut;
  - anywhere else, the overspray.
- Cut-out objects (buds, cans, boomboxes) sit over the seams and never cover a button or a line of text. Up to 1024 px
  one hung across a seam by an inline offset sits inside the gap between the two sections' content (fix.css): centred
  when the gap allows, at least 16 px clear of both, no taller than the gap. `private/float-overlap.mjs` checks every
  page. Its ALLOW list holds the one deliberate overlap, the home hero's spray can tagging the "Est. 2022" sticker.
- Real event flyers are shown whole (2:3, matted by the flyer paper), never cropped.

**Imagery**
- Store photos are the client's own.
- Products and atmosphere are fal-generated.
- Real places are real photos with their licence credited, never generated.
