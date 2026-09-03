#!/usr/bin/env bash
# Subset HarmonyOS Sans SC down to the glyphs this UI actually uses.
#
# A full SC face is ~4.3 MB — far too heavy to ship. Everything on this site is drawn
# from a small, known set of characters (the UI strings plus digits and punctuation),
# so the subset lands in the tens of KB.
#
# Requirements:
#   pip install fonttools brotli
#
# Usage:
#   1. Download HarmonyOS Sans SC (free for commercial use) from
#      https://developer.huawei.com/consumer/cn/doc/design-guides/font-0000001157868583
#   2. Put HarmonyOS_Sans_SC_Bold.ttf (or Regular) in vendor/fonts/
#   3. ./scripts/subset-font.sh
#
# The site renders correctly without this step — the @font-face in app/globals.css
# simply falls through to the system stack.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${1:-$ROOT/vendor/fonts/HarmonyOS_Sans_SC_Bold.ttf}"
OUT="$ROOT/public/fonts/HarmonyOS_Sans_SC-subset.woff2"

if [[ ! -f "$SRC" ]]; then
  echo "Source font not found: $SRC" >&2
  echo "Download HarmonyOS Sans SC and place it there, or pass the path as an argument." >&2
  exit 1
fi

if ! command -v pyftsubset >/dev/null 2>&1; then
  echo "pyftsubset not found. Install it with: pip install fonttools brotli" >&2
  exit 1
fi

# Every character the UI can render, harvested straight from the two dictionaries so
# the subset can never drift out of sync with the copy.
TEXT_FILE="$(mktemp)"
trap 'rm -f "$TEXT_FILE"' EXIT

node -e '
  const path = require("path");
  const root = process.argv[1];
  const read = (f) => require("fs").readFileSync(path.join(root, "i18n", f), "utf8");
  // Dictionary values plus the product copy in the seed, plus digits and punctuation.
  const sources = [read("en.ts"), read("zh.ts"), read("../lib/catalog.ts")].join("");
  const extra = "0123456789$.,:%/–—·()[]{}+-=@#&*!?’“”";
  const chars = new Set([...sources, ...extra]);
  process.stdout.write([...chars].join(""));
' "$ROOT" > "$TEXT_FILE"

mkdir -p "$(dirname "$OUT")"

pyftsubset "$SRC" \
  --output-file="$OUT" \
  --flavor=woff2 \
  --layout-features="kern,liga,tnum" \
  --text-file="$TEXT_FILE" \
  --no-hinting \
  --desubroutinize

printf 'Wrote %s (%s)\n' "$OUT" "$(du -h "$OUT" | cut -f1)"
