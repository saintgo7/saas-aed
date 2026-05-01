#!/usr/bin/env bash
# Generate placeholder PNGs for all SCREENSHOT markers in the book.
# Each PNG is a 1600x900 labeled placeholder. Real captures replace these later.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHOTS_DIR="${ROOT}/docs/book/assets/screenshots"
mkdir -p "${SHOTS_DIR}"

# Extract unique slugs across both ko and en
SLUGS=$(grep -rh '<!-- SCREENSHOT: ' "${ROOT}/docs/book/ko" "${ROOT}/docs/book/en" \
  | sed -E 's|.*SCREENSHOT: ([^ ]+) -->.*|\1|' \
  | sort -u)

count_total=$(echo "${SLUGS}" | wc -l | tr -d ' ')
count_done=0
count_skipped=0

# Style tokens (brand colors)
BG="#F8FAFC"
FG="#0F172A"
ACCENT="#1E40AF"
SUB="#475569"

echo "[gen] generating ${count_total} placeholder screenshots → ${SHOTS_DIR}"

for slug in ${SLUGS}; do
  out="${SHOTS_DIR}/${slug}.png"

  if [[ -f "${out}" ]]; then
    count_skipped=$((count_skipped + 1))
    continue
  fi

  # Derive title from slug
  # ch07-step02-auth-config → Chapter 7 · Step 2
  if [[ "${slug}" =~ ^ch([0-9]+)-step([0-9]+)-(.+)$ ]]; then
    ch="${BASH_REMATCH[1]}"
    step="${BASH_REMATCH[2]}"
    rest="${BASH_REMATCH[3]}"
    title="Chapter ${ch} · Step ${step}"
    sub="${rest//-/ }"
  elif [[ "${slug}" =~ ^app-([a-d])-step([0-9]+)-(.+)$ ]]; then
    app="${BASH_REMATCH[1]}"
    step="${BASH_REMATCH[2]}"
    rest="${BASH_REMATCH[3]}"
    app_upper=$(echo "${app}" | tr '[:lower:]' '[:upper:]')
    title="Appendix ${app_upper} · Step ${step}"
    sub="${rest//-/ }"
  else
    title="${slug}"
    sub="placeholder"
  fi

  magick -size 1600x900 "xc:${BG}" \
    -font /System/Library/Fonts/Supplemental/Arial.ttf \
    -fill "${ACCENT}" -draw "rectangle 0,0 1600,8" \
    -fill "${ACCENT}" -draw "rectangle 0,892 1600,900" \
    -gravity NorthWest -fill "${SUB}" -pointsize 22 \
      -annotate +60+60 "AED Inspection SaaS" \
    -gravity Center -fill "${FG}" -pointsize 64 \
      -annotate +0-60 "${title}" \
    -gravity Center -fill "${ACCENT}" -pointsize 36 \
      -annotate +0+30 "${sub}" \
    -gravity Center -fill "${SUB}" -pointsize 22 \
      -annotate +0+120 "[ placeholder · replace with real capture ]" \
    -gravity SouthEast -fill "${SUB}" -pointsize 18 \
      -annotate +60+60 "${slug}.png" \
    "${out}"

  count_done=$((count_done + 1))
done

echo "[gen] done — created ${count_done}, skipped ${count_skipped} (already existed)"
