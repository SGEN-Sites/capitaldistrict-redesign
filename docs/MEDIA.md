# Media

Written by `tools/media-doc.mjs` from `src/content/images.json` and the fal job records.

- **166 client images** from the live site (photos, flyers, logos), resized to WebP only.
- **3 client photos enlarged** with fal Topaz High Fidelity V2 (no content change): IPTC
  "compositeWithTrainedAlgorithmicMedia" in each file, `data-ai="edited"` on the page.
- **20 generated images** (mood and category illustration only; never the stores, staff, customers, products or
  a real place): IPTC "trainedAlgorithmicMedia" in each file, `data-ai="generated"` on the page.
- **2 generated loops** (`assets/video/turntable-*.mp4`, `mural-*.mp4`): fal Kling 2.5 Turbo Pro image-to-video with the
  first and last frame set to the same still, folded with a short crossfade and encoded with macOS VideoToolbox H.264.
  Higgsfield (Kling 3.0 Pro, Kling 2.5 Turbo) was tried first and refused both jobs for low credit; nothing was charged.
- **10 photos of real places** from Wikimedia Commons, credited under each photo (see the last section).

Rules used on every generated still: no people, hands or faces; no text, numbers, logos or labels; blank packaging;
one hard key light from the upper left and a thin lime rim light; shot on black so it composites onto the dark bands.
Each render was reviewed at full size; the first pre-roll render read as cigarettes and was regenerated.

## Generated

| id | size | model | request | prompt |
|---|---|---|---|---|
| `wall-mural` | 2752 x 1536 | `fal-ai/flux-pro/v1.1-ultra` | `01a1d20a-3c59-70c3-80ec-f7e646b3f401` | Cinematic night photograph, deep black shadows, rich blacks, fine 35mm film grain. Straight-on view of a dark painted concrete wall with an abstract graffiti hall-of-fame mural made only of flowing shapes: lime green (#A1CF6E) and mint white arrows and 3D bubb… |
| `wall-mural-wide` | 3136 x 1344 | `fal-ai/flux-pro/v1.1-ultra` | `01a1d20a-3c5e-7131-aab1-71397dae1317` | Cinematic night photograph, deep black shadows, one hard spotlight, rich blacks, fine 35mm film grain, shot on a full-frame camera. A long weathered dark brick wall in an urban alley covered in a huge abstract wildstyle graffiti mural made ONLY of shapes: bold… |
| `alley` | 3136 x 1344 | `fal-ai/flux-pro/v1.1-ultra` | `01a1d20a-3c5e-78a0-999f-7dc135404a84` | Cinematic night photograph, deep black shadows, fine 35mm film grain, shot on a full-frame camera, wide angle. An empty wet city alley after rain between old red brick buildings in upstate New York, faint abstract graffiti shapes on the walls (no letters), lim… |
| `turntable` | 2752 x 1536 | `fal-ai/flux-pro/v1.1-ultra` | `01a1d20a-3c5e-78a0-999f-7dde983a5f21` | Cinematic still life photograph on a pure black background: a vintage unbranded brushed-silver DJ turntable seen from a low three-quarter angle, a glossy black vinyl record with a plain lime green (#A1CF6E) centre label on the platter, the tonearm resting on t… |
| `cat-flower` | 2048 x 2048 | `fal-ai/flux-pro/v1.1-ultra` | `01a1d20a-3c5c-7b52-af43-beb432d4b729` | Cinematic macro still life photograph on a pure black background: one large dense frosty cannabis flower bud with bright orange pistils and glittering white trichomes, centred, filling 60% of the frame. One hard white key light from the upper left, a thin lime… |
| `cat-prerolls` | 2048 x 2048 | `fal-ai/flux-pro/v1.1-ultra` | `01a1d20c-fb70-7200-b089-316ad2f4342c` | Cinematic still life photograph on a pure black background: three cannabis pre-roll joints shaped like long tapered CONES, clearly wide at one open end and narrow at the other, the wide open ends packed with visible bright green ground cannabis flower, the nar… |
| `cat-edibles` | 2048 x 2048 | `fal-ai/flux-pro/v1.1-ultra` | `01a1d20a-67e3-74c2-a621-2f08aa2e85a4` | Cinematic still life photograph on a pure black background: a small neat stack of square artisanal fruit chews dusted with fine sugar, in muted natural fruit colours, resting on a matte black stone dish, centred, a single cannabis leaf beside them. One hard wh… |
| `cat-vapes` | 2048 x 2048 | `fal-ai/flux-pro/v1.1-ultra` | `01a1d20a-690e-7923-a033-732f67adac51` | Cinematic still life photograph on a pure black background: a sleek matte black unbranded all-in-one vape pen standing upright next to a glass 510 vape cartridge filled with clear golden amber cannabis oil with a black mouthpiece, centred. One hard white key l… |
| `cat-concentrates` | 2048 x 2048 | `fal-ai/flux-pro/v1.1-ultra` | `01a1d20a-6ab2-7871-91ee-82b6ea4d6509` | Cinematic macro still life photograph on a pure black background: a translucent shard of amber cannabis shatter and a glistening golden dollop of live resin badder on a small square of white parchment paper, centred. One hard white key light from the upper lef… |
| `cat-tinctures` | 2048 x 2048 | `fal-ai/flux-pro/v1.1-ultra` | `01a1d20a-6b41-7a90-8385-703a3d5bc403` | Cinematic still life photograph on a pure black background: an amber glass dropper bottle with a black rubber dropper cap and a completely blank label-free surface, a single golden oil drop falling from the glass pipette held just above it on a stand, centred.… |
| `cat-beverages` | 2048 x 2048 | `fal-ai/flux-pro/v1.1-ultra` | `01a1d20a-78c0-7f50-a717-98543fa16f79` | Cinematic still life photograph on a pure black background: a slim matte charcoal blank aluminium drink can with no label or print, covered in cold condensation droplets, standing beside a few ice cubes and a single fresh cannabis leaf, centred. One hard white… |
| `cat-accessories` | 2048 x 2048 | `fal-ai/flux-pro/v1.1-ultra` | `01a1d20a-7aac-7d72-9fed-6065e494cc92` | Cinematic still life photograph on a pure black background: a matte black four-piece metal herb grinder with its lid off showing ground green herb inside, beside a clear hand-blown glass hand pipe, arranged on black slate, centred. One hard white key light fro… |
| `cat-cbd` | 2048 x 2048 | `fal-ai/flux-pro/v1.1-ultra` | `01a1d21b-ab62-7b23-b312-8cc1267920f4` | Cinematic still life photograph on a pure black background: a few dried hemp flower buds and two fresh hemp leaves arranged on a round white ceramic dish beside a small clear glass jar of pale golden oil, calm and clean wellness mood, centred. One hard white k… |
| `cat-topicals` | 2048 x 2048 | `fal-ai/flux-pro/v1.1-ultra` | `01a1d20a-933e-7a50-845a-f50ae882824c` | Cinematic still life photograph on a pure black background: a single fresh hemp leaf with serrated fingers lying across a smooth river stone, beside a small frosted glass jar of pale balm with its lid off, centred, calm and clean wellness mood. One hard white … |
| `obj-bud-a` | 1075 x 1026 | `fal-ai/birefnet/v2` | `01a1d20c-a203-7b30-9362-097ea42e0a0e` | cut-out / edit of obj-bud-a#0 |
| `obj-bud-b` | 752 x 1240 | `fal-ai/birefnet/v2` | `01a1d20c-a205-75d0-a792-d3efed2285c6` | cut-out / edit of obj-bud-b#0 |
| `obj-spraycan` | 864 x 1458 | `fal-ai/birefnet/v2` | `01a1d20c-a204-7ae0-ba31-450bb409e1c3` | cut-out / edit of obj-spraycan#0 |
| `obj-boombox` | 1360 x 823 | `fal-ai/birefnet/v2` | `01a1d20c-fb6e-7511-9fa7-e77b4691ea32` | cut-out / edit of obj-boombox#0 |
| `loop-turntable` | 1600 x 890 | `fal-ai/kling-video/v2.5-turbo/pro/image-to-video` | `01a1d20d-811c-7dc2-a59d-557cd37e84d5` | Locked-off static camera. The black vinyl record turns steadily clockwise on the turntable platter at a constant speed, the lime green centre label rotating with it, the tonearm stays still, the lime green glow ring around the platter softly pulses. Nothing el… |
| `loop-mural` | 1600 x 890 | `fal-ai/kling-video/v2.5-turbo/pro/image-to-video` | `01a1d20d-811b-7943-88ac-0c160f14733c` | Locked-off static camera on a graffiti mural at night. A soft spotlight beam slowly drifts across the wall from left to right and back, the wet paint drips glisten as the light passes, a few dust motes float in the beam. The mural itself does not change shape.… |

## Enlarged client photos

| id | size | model | request | source |
|---|---|---|---|---|
| `skyline` | 3000 x 2946 | `fal-ai/topaz/upscale/image` | `01a1d212-3dfa-70d3-9c8e-afd41a1850a0` | cut-out / edit of file:assets/source/9aef9b13-Img.png |
| `store-mural` | 3200 x 1800 | `fal-ai/topaz/upscale/image` | `01a1d212-421b-7712-8aa0-dc076c080b05` | cut-out / edit of file:assets/source/68464011-1271851a8965248a7f523021872ea520.png |
| `store-albany` | 1528 x 2040 | `fal-ai/topaz/upscale/image` | `01a1d212-3d3e-7c40-b6a1-a322292b3ef9` | cut-out / edit of file:assets/source/f85f9346-cdcw-albany.jpeg |

## Photos of real places (Wikimedia Commons): the store pages' "things to do" story

Added by hand on 2026-11-13 (`tools/media-doc.mjs` carries this section over as written and counts these photos apart
from the client images). Used by `storyBand()` in `src/pages/stores.mjs` on `/location/albany/` and
`/location/schenectady/` (`/location/clifton-park/` has no "things to do" text in the capture).

A generated image never stands in for a real place, so every place in the story is a real photograph of that place
from Wikimedia Commons, public domain first and otherwise CC BY / CC BY-SA, credited under the photo on the page
("Photo: author, licence, via Wikimedia Commons": the author links to the file page, the licence to its deed). A place
with no free photo of its own gets an illustrated map-pin card with its name only (no distance or other fact). The
closing chapter of each story is the client's own store photo (`store-albany`, `m-2025-08-image-1`).

- Found and checked with the Commons API (`imageinfo` + `extmetadata`: licence, licence URL, author, date,
  description) by `private/story/commons-research.mjs`, `commons-more.mjs` and `commons-cats.mjs`; chosen by eye from
  contact sheets (`private/story-commons/sheets/`). Photos from Albany, Western Australia (the same search words) were
  left out.
- The full-size files were downloaded by `private/story/commons-download.mjs` into a private folder (not published), each checked
  against the SHA-1 the API gives; licence data in `private/story-commons/chosen.json`.
- Processed by `private/story/process-places.py`: resized only (no crop, no retouch, no AI) to WebP at 1600, 960 and
  540 px wide (quality 82, stepped down to no lower than 70 to keep the 1600 file near 260 KB), with the attribution
  embedded as XMP (`dc:creator`, `dc:rights`, `dc:source`, `xmpRights:WebStatement`) and IPTC DigitalSourceType
  `digitalCapture`. Registry entries `pl-*` in `src/content/images.json` carry `photo: true`, `credit`, `license`,
  `licenseUrl`, `source` (the Commons file page), `title`, `original` and `sha1`.

| id | place | Commons file | author | licence | taken | original | WebP sizes |
|---|---|---|---|---|---|---|---|
| `pl-washington-park` | Washington Park (Albany) | [Tulips in Washington Park.jpg](https://commons.wikimedia.org/wiki/File:Tulips_in_Washington_Park.jpg) | Tim Schapker | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | 2008-05-06 | 3000 x 2400 | 540: 56 KB, 960: 162 KB, 1600: 393 KB |
| `pl-pine-bush` | Albany Pine Bush Preserve | [Albany Pine Bush landscape.jpg](https://commons.wikimedia.org/wiki/File:Albany_Pine_Bush_landscape.jpg) | Daniel Case | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | 2015-08-19 | 6048 x 3760 | 540: 50 KB, 960: 132 KB, 1600: 350 KB |
| `pl-capitol-plaza` | New York State Capitol and Empire State Plaza | [Empire State Plaza at sunset.jpg](https://commons.wikimedia.org/wiki/File:Empire_State_Plaza_at_sunset.jpg) | Sashimi-b | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 2026-05-29 | 6016 x 4054 | 540: 26 KB, 960: 64 KB, 1600: 137 KB |
| `pl-state-museum` | New York State Museum (the Cohoes Mastodon) | [Cohoes Mastodon, NYS Museum, Albany, NY.jpg](https://commons.wikimedia.org/wiki/File:Cohoes_Mastodon,_NYS_Museum,_Albany,_NY.jpg) | Skunkworks Photographic | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | 2011-01-12 | 4288 x 2848 | 540: 27 KB, 960: 62 KB, 1600: 133 KB |
| `pl-colonie-center` | Colonie Center | [Glowing Colonie Center marquee.jpg](https://commons.wikimedia.org/wiki/File:Glowing_Colonie_Center_marquee.jpg) | Tyler A. McNeil | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 2021-06-13 | 5033 x 3355 | 540: 17 KB, 960: 35 KB, 1600: 72 KB |
| `pl-crossgates` | Crossgates Mall | [Crossgates mall.JPG](https://commons.wikimedia.org/wiki/File:Crossgates_mall.JPG) | Flyer84 at English Wikipedia | Public domain (statement on the file page) | uploaded 2007-08-05 | 1898 x 1269 | 540: 37 KB, 960: 83 KB, 1600: 157 KB |
| `pl-ualbany` | University at Albany (postcard) | [Approaching the Academic Podium UAlbany.jpg](https://commons.wikimedia.org/wiki/File:Approaching_the_Academic_Podium_UAlbany.jpg) | Beyond My Ken | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 2011-10-28 | 2086 x 1380 | 540: 26 KB, 960: 71 KB, 1600: 157 KB |
| `pl-alb-airport` | Albany International Airport (postcard) | [Albany International Airport.jpg](https://commons.wikimedia.org/wiki/File:Albany_International_Airport.jpg) | Flyer84 | Public domain (statement on the file page) | uploaded 2007-08-04 | 2048 x 1536 | 540: 45 KB, 960: 98 KB, 1600: 196 KB |
| `pl-proctors` | Proctors Theatre (Schenectady) | [Proctors schenectady interior.jpg](https://commons.wikimedia.org/wiki/File:Proctors_schenectady_interior.jpg) | Proctors Collaborative Archive | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | 2015-08-20 | 5952 x 3968 | 540: 47 KB, 960: 114 KB, 1600: 297 KB |
| `pl-misci` | miSci, Museum of Innovation and Science (Schenectady; a locomotive on display there) | [Great Northern Railway Alco RS-3 No. 299 in Schenectady, New York, August 2015.jpg](https://commons.wikimedia.org/wiki/File:Great_Northern_Railway_Alco_RS-3_No._299_in_Schenectady,_New_York,_August_2015.jpg) | David Wilson | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | 2015-08-30 | 2816 x 2112 | 540: 35 KB, 960: 97 KB, 1600: 233 KB |

No free photo of the place itself was found on Commons (keyword searches, the place categories and the Schenectady
category tree were checked), so these chapters use the map-pin card:

- **Central Park Rose Garden** (Schenectady): Commons has a CC0 photo of Iroquois Lake in the same park, but not of
  the rose garden; it was not used, since it would stand in for a different spot.
- **The Edison Downtown** (Schenectady): no photo of the restaurant on Commons; a street view of downtown was not
  used for the same reason.
