#!/usr/bin/env bash
# generate.sh — build DOCX + PDF for both Korean and English editions
#
# Usage:
#   ./docs/book/generate.sh                   # build all four (ko/en × docx/pdf)
#   ./docs/book/generate.sh ko                # KO edition only (docx + pdf)
#   ./docs/book/generate.sh en                # EN edition only
#   ./docs/book/generate.sh ko docx           # KO docx only
#   ./docs/book/generate.sh en pdf            # EN pdf only
#   VERIFY_SCREENSHOTS=1 ./docs/book/generate.sh   # fail if screenshot files missing
#
# Dependencies:
#   - pandoc 3.x+
#   - xelatex (e.g., MacTeX or TeX Live)
#   - Korean font: Pretendard Variable (https://github.com/orioncactus/pretendard)
#   - English font: Inter (https://rsms.me/inter/)
#   - Mono font: JetBrains Mono (https://www.jetbrains.com/lp/mono/)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BOOK_DIR="${ROOT_DIR}/docs/book"
DIST_DIR="${BOOK_DIR}/dist"
TEMPLATES_DIR="${BOOK_DIR}/templates"

mkdir -p "$DIST_DIR"

# --- args -------------------------------------------------------------------
LANG_FILTER="${1:-all}"   # all | ko | en
FMT_FILTER="${2:-all}"    # all | docx | pdf

# --- screenshot verification (optional) -------------------------------------
if [[ "${VERIFY_SCREENSHOTS:-0}" == "1" ]]; then
  echo "[verify] checking screenshot coverage..."
  "${ROOT_DIR}/scripts/verify-screenshots.sh" --strict
fi

# --- collect chapter files (cover + ch01..ch17 + appendix A..D) -------------
collect_inputs() {
  local lang="$1"
  local dir="${BOOK_DIR}/${lang}"
  local out=()
  # cover
  [[ -f "${dir}/00-cover.md" ]] && out+=("${dir}/00-cover.md")
  # chapters 01..17 in order
  for f in "${dir}"/[0-9][0-9]-*.md; do
    [[ "$(basename "$f")" == "00-cover.md" ]] && continue
    out+=("$f")
  done
  # appendix A..D in order
  if [[ -d "${dir}/appendix" ]]; then
    for f in "${dir}/appendix"/[A-D]-*.md; do
      out+=("$f")
    done
  fi
  printf '%s\n' "${out[@]}"
}

build_one() {
  local lang="$1"   # ko | en
  local fmt="$2"    # docx | pdf
  local defaults="${TEMPLATES_DIR}/pandoc-${lang}.yaml"
  local stamp; stamp="$(date +%Y%m%d)"
  local outname="aed-saas-book-${lang}-${stamp}.${fmt}"
  local outpath="${DIST_DIR}/${outname}"

  if [[ ! -f "$defaults" ]]; then
    echo "ERROR: defaults file not found: $defaults" >&2
    return 1
  fi

  echo "[build] lang=${lang} fmt=${fmt} -> ${outpath}"

  # Resolve image paths relative to the book directory
  pandoc \
    --defaults="$defaults" \
    --resource-path="${BOOK_DIR}:${BOOK_DIR}/${lang}:${BOOK_DIR}/${lang}/appendix:${BOOK_DIR}/assets" \
    -o "$outpath" \
    $(collect_inputs "$lang")

  echo "[done]  ${outpath}"
}

# --- main loop --------------------------------------------------------------
LANGS=()
case "$LANG_FILTER" in
  all) LANGS=(ko en) ;;
  ko)  LANGS=(ko) ;;
  en)  LANGS=(en) ;;
  *)   echo "Unknown lang: $LANG_FILTER (use ko|en|all)" >&2; exit 2 ;;
esac

FMTS=()
case "$FMT_FILTER" in
  all)  FMTS=(docx pdf) ;;
  docx) FMTS=(docx) ;;
  pdf)  FMTS=(pdf) ;;
  *)    echo "Unknown fmt: $FMT_FILTER (use docx|pdf|all)" >&2; exit 2 ;;
esac

for lang in "${LANGS[@]}"; do
  for fmt in "${FMTS[@]}"; do
    build_one "$lang" "$fmt"
  done
done

echo ""
echo "All artifacts in: ${DIST_DIR}"
ls -lh "$DIST_DIR" || true
