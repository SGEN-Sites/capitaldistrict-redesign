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
