# Brand system

The values live in `src/styles/tokens.css`; this page explains them. Brand hexes were measured from the live site's
`:root` custom properties on 2026-11-13; everything else is derived from them.

## Colour

| token | value | role | contrast |
|---|---|---|---|
| `--lime` | `#a1cf6e` | the brand colour: the second line of every display heading, buttons, status dots, rims and drips | on night about 9.8:1, on charcoal about 7.4:1 |
| `--ink` | `#2a3130` | brand charcoal: bands, text on lime | text on lime about 7.4:1 |
| `--ink-2` | `#1f2926` | brand deep green-black: cards | |
| `--slate` | `#404a49` | brand surface | |
| `--mint` | `#dfece7` | brand neutral: the one "lights on" band per page | on night about 14.5:1 |
| `--night` | `#141a19` | derived: the deepest ground, lit by one key light per band | |
| `--text-2` | `#b9c7c1` | secondary text | on night about 10:1 |
| `--text-3` | `#8fa09a` | meta text, 14px and up | on night about 6.4:1, on charcoal about 4.9:1 |

## Type

| role | face | notes |
|---|---|---|
| display | Anybody (variable: width 50 to 150, weight 100 to 900) | open stand-in for the live site's Adobe "scale-variable"; set at width 118% and weight 880, uppercase, line height 0.88; headings stretch open from 64% on arrival |
| body and interface | Work Sans (400 to 700) | the live site's own body face; 17px, line height 1.65 (16px on phones) |
| tag hand | Sedgwick Ave Display | graffiti hand for one tagged word or sticker per section at most |

All three are SIL Open Font License fonts, self-hosted from `src/assets/fonts/` (latin subset, woff2).

## Marks

The wordmark (`src/assets/brand/logo.svg`) and the round badge (`round-logo-*.webp`, rendered from the live site's
`Round-1.svg`) are the client's own, unchanged. The badge is the label of the record.

## Surfaces

- Bands: dark grounds with one lime key light (`--key`, positioned by `--lx` / `--ly`), a raking beam and a vignette;
  film grain over the whole page at 5.5% in overlay.
- Glass: `.glass` (gradient fill, 18px blur, a lit 1px edge, a solid fallback where backdrop-filter is unsupported),
  used only over imagery.
- Radii: 10 / 18 / 28 / 40px and pills; stickers are die-cut with a white keyline.
- Motion: `cubic-bezier(.16, 1, .3, 1)` for almost everything, 0.25 / 0.5 / 0.95s; everything off under reduced motion.
