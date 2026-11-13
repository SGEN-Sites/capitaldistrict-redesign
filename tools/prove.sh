#!/usr/bin/env bash
# prove.sh: build and run the checks in one go. Prints each stage's summary; the site-reforge gate's verdict is the
# authority on "ready", and it is reported as it comes out (a redesign pitch is expected to carry structural FAILs:
# see docs/PUBLISH.md).
set -u
cd "$(dirname "$0")/.."
P="$(pwd)"
SK="$HOME/.claude/skills/site-reforge/scripts"
echo "== build (production)"; node src/build.mjs || exit 1
echo "== ui test";            node tools/ui-test.mjs --dir dist --pages /,/location/,/location/albany/,/visit-us/cannabis-dispensary-near-hoosick-falls-ny/,/store-locator/,/shop/,/deals/,/how-to-order/,/pickup/,/brands/,/our-brands/ayrloom/,/blog/,/learn/,/events/,/about/,/loyalty-program/,/contact/,/faq/,/reviews/,/terms-conditions/,/sitemap/ | tail -3
echo "== decontaminate";      node "$SK/sr-decontaminate.mjs" --project "$P" --dir "$P/dist" | tail -6
echo "== seo";                node "$SK/sr-seo.mjs" --project "$P" --dir "$P/dist" --site-url https://capitaldistrictcannabis.com | tail -8
echo "== parity";             node "$SK/sr-parity.mjs" --project "$P" --new "$P/dist" | tail -10
echo "== fabrication";        node "$SK/sr-fabrication.mjs" --project "$P" --dir "$P/dist" | tail -8
echo "== images";             node "$SK/sr-images.mjs" --project "$P" --dir "$P/dist" | tail -5
echo "== rebase (check)";     node "$SK/sr-rebase.mjs" --dir "$P/dist" --check | tail -4
echo "== gate";               node "$SK/sr-gate.mjs" --project "$P" | tail -45
echo "== report";             node "$SK/sr-report.mjs" --project "$P" | tail -2
echo "== media doc";          node tools/media-doc.mjs
echo "== preview build";      node src/build.mjs --preview --out dist-preview --base /capitaldistrict-redesign/
