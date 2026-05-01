#!/usr/bin/env bash
# Render terminal text as a styled PNG matching our book's screenshot dimensions (1600x900).
# Usage: ./render-terminal-png.sh <slug> <title> < text_from_stdin
set -euo pipefail

SLUG="${1:?slug required (e.g. ch04-step02-docker-compose-up)}"
TITLE="${2:?title required (e.g. \"docker ps\")}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/docs/book/assets/screenshots"
OUT="${OUT_DIR}/${SLUG}.png"

mkdir -p "${OUT_DIR}"

# Read text from stdin; truncate to ~40 lines for visual balance
TEXT=$(head -c 8000 | head -n 40)

# Background colors (VS Code dark+ inspired)
BG="#1E1E1E"
FG="#D4D4D4"
HDR_BG="#252526"
HDR_FG="#9CDCFE"
ACCENT="#1E40AF"

# Use macOS Menlo monospace (always available)
FONT="/System/Library/Fonts/Menlo.ttc"

# Header bar height 64, body 836 (=900-64)
magick -size 1600x64 "xc:${HDR_BG}" \
  -font "${FONT}" -fill "${HDR_FG}" -pointsize 22 \
  -gravity West -annotate +24+0 "  ●  ●  ●    ${TITLE}" \
  /tmp/_hdr.png

magick -size 1600x836 "xc:${BG}" \
  -font "${FONT}" -fill "${FG}" -pointsize 18 \
  -gravity NorthWest \
  -annotate +24+24 "${TEXT}" \
  /tmp/_body.png

magick /tmp/_hdr.png /tmp/_body.png -append \
  -bordercolor "${ACCENT}" -border 0x4 \
  "${OUT}"

rm -f /tmp/_hdr.png /tmp/_body.png

echo "[render] ${SLUG} → ${OUT}"
