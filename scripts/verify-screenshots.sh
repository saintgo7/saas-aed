#!/usr/bin/env bash
# verify-screenshots.sh
# 모든 .md 파일에서 <!-- SCREENSHOT: slug --> 마커를 추출하고
# docs/book/assets/screenshots/{slug}.png 파일 존재 여부를 확인합니다.
#
# 사용법:
#   ./scripts/verify-screenshots.sh
#   ./scripts/verify-screenshots.sh --strict    # 누락 시 exit 1
#
# 출력:
#   [OK]      ch07-step02-auth-config        docs/book/ko/07-auth.md:42
#   [MISSING] ch09-step03-signature-canvas   docs/book/ko/09-signature.md:88

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOOK_DIR="${ROOT_DIR}/docs/book"
SHOT_DIR="${BOOK_DIR}/assets/screenshots"
STRICT=0

for arg in "$@"; do
  case "$arg" in
    --strict) STRICT=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
  esac
done

if [[ ! -d "$BOOK_DIR" ]]; then
  echo "ERROR: book directory not found: $BOOK_DIR" >&2
  exit 2
fi

mkdir -p "$SHOT_DIR"

total=0
missing=0
ok=0

# Find all SCREENSHOT markers across .md files
while IFS=: read -r file lineno content; do
  slug="$(echo "$content" | sed -E 's/.*<!-- SCREENSHOT:[[:space:]]*([a-z0-9-]+)[[:space:]]*-->.*/\1/')"
  [[ -z "$slug" ]] && continue
  total=$((total + 1))
  png="${SHOT_DIR}/${slug}.png"
  rel_file="${file#${ROOT_DIR}/}"
  if [[ -f "$png" ]]; then
    printf "[OK]      %-40s %s:%s\n" "$slug" "$rel_file" "$lineno"
    ok=$((ok + 1))
  else
    printf "[MISSING] %-40s %s:%s\n" "$slug" "$rel_file" "$lineno"
    missing=$((missing + 1))
  fi
done < <(grep -rn -E '<!-- SCREENSHOT:[[:space:]]*[a-z0-9-]+[[:space:]]*-->' "$BOOK_DIR" --include='*.md' || true)

echo ""
echo "Summary: total=${total} ok=${ok} missing=${missing}"

if [[ "$STRICT" -eq 1 && "$missing" -gt 0 ]]; then
  exit 1
fi
exit 0
