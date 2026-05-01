#!/usr/bin/env bash
# capture-helper.sh
# macOS 인터랙티브 스크린샷을 찍은 후 표준 파일명으로 자동 저장합니다.
#
# 사용법:
#   ./scripts/capture-helper.sh ch07-step02-auth-config
#   ./scripts/capture-helper.sh ch07-step02-auth-config "Auth.js 다기관 설정"
#
# 동작:
#   1. screencapture -i (영역 선택 모드) 실행
#   2. 임시 파일에 저장
#   3. docs/book/assets/screenshots/{slug}.png 으로 이동
#   4. 캡션 인자가 주어지면 해당 슬러그를 포함한 마크다운 스니펫 출력

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHOT_DIR="${ROOT_DIR}/docs/book/assets/screenshots"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <slug> [caption]" >&2
  echo "  slug example: ch07-step02-auth-config" >&2
  exit 2
fi

SLUG="$1"
CAPTION="${2:-}"

# Validate slug format
if [[ ! "$SLUG" =~ ^ch[0-9]{2}-step[0-9]{2}-[a-z0-9-]+$ ]] && [[ ! "$SLUG" =~ ^app-[a-z]-step[0-9]{2}-[a-z0-9-]+$ ]]; then
  echo "ERROR: slug must match ch{NN}-step{NN}-{kebab} or app-{a-d}-step{NN}-{kebab}" >&2
  echo "       got: $SLUG" >&2
  exit 2
fi

mkdir -p "$SHOT_DIR"
DEST="${SHOT_DIR}/${SLUG}.png"

if [[ -f "$DEST" ]]; then
  read -r -p "File exists: $DEST. Overwrite? [y/N] " ans
  case "$ans" in
    y|Y) ;;
    *) echo "Aborted."; exit 0 ;;
  esac
fi

if ! command -v screencapture >/dev/null 2>&1; then
  echo "ERROR: screencapture not found. This script requires macOS." >&2
  exit 3
fi

TMP="$(mktemp -t capture).png"
echo "Drag to select region, or press Esc to cancel..."
screencapture -i "$TMP"

if [[ ! -s "$TMP" ]]; then
  echo "Capture cancelled (no file produced)."
  rm -f "$TMP"
  exit 0
fi

mv "$TMP" "$DEST"
echo "Saved: $DEST"

if [[ -n "$CAPTION" ]]; then
  echo ""
  echo "Markdown snippet:"
  echo "----"
  cat <<EOF
<!-- SCREENSHOT: ${SLUG} -->
![${CAPTION}](../assets/screenshots/${SLUG}.png)
*${CAPTION}*
<!-- /SCREENSHOT -->
EOF
  echo "----"
fi
