#!/usr/bin/env bash
# deploy-bootstrap.sh — abada-65 첫 배포 1회용 부트스트랩
#
# 실행 위치: 서버에서 git clone 한 saas-aed 저장소 루트
# 실행 사용자: aedops (sudo 권한 필요한 디렉토리 생성용)
# 효과:
#   - /data/saas-aed/{postgres,redis,backup,nginx-cache,cloudflared,scripts} 생성
#   - .env.production 템플릿 복사 (이미 있으면 건너뜀)
#   - cloudflared/config.example.yml → /data/saas-aed/cloudflared/config.yml 복사
#   - scripts/backup.sh 복사 + 권한
#   - docker compose pull 수행
#
# 다음 단계 안내 출력으로 끝남.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_ROOT="/data/saas-aed"

readonly REPO_ROOT DATA_ROOT

log() { printf '\033[1;34m[bootstrap]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[bootstrap]\033[0m %s\n' "$*" >&2; }
err() { printf '\033[1;31m[bootstrap]\033[0m %s\n' "$*" >&2; }

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    err "필수 명령 없음: $cmd"
    exit 1
  fi
}

# ─── 0. 사전 점검 ────────────────────────────────────
log "사전 점검..."
require_cmd docker
require_cmd sudo

if ! docker compose version >/dev/null 2>&1; then
  err "docker compose plugin 이 설치되어 있지 않습니다."
  exit 1
fi

if [[ ! -f "${REPO_ROOT}/docker-compose.yml" ]]; then
  err "docker-compose.yml 을 ${REPO_ROOT} 에서 찾을 수 없습니다."
  exit 1
fi

# ─── 1. 디렉토리 생성 ─────────────────────────────────
log "/data/saas-aed/* 디렉토리 생성 (sudo 사용)..."
sudo mkdir -p \
  "${DATA_ROOT}/postgres" \
  "${DATA_ROOT}/redis" \
  "${DATA_ROOT}/backup" \
  "${DATA_ROOT}/nginx-cache" \
  "${DATA_ROOT}/cloudflared" \
  "${DATA_ROOT}/scripts"

# 소유자: 현재 사용자 (보통 aedops)
sudo chown -R "$(id -u):$(id -g)" "${DATA_ROOT}"
sudo chmod 700 "${DATA_ROOT}/cloudflared"
sudo chmod 700 "${DATA_ROOT}/backup"

log "디렉토리 트리:"
ls -la "${DATA_ROOT}"

# ─── 2. .env.production 템플릿 복사 ──────────────────
ENV_TARGET="${DATA_ROOT}/.env.production"
if [[ -f "$ENV_TARGET" ]]; then
  warn ".env.production 이 이미 존재합니다. 건너뜁니다."
else
  log ".env.example → .env.production 복사..."
  cp "${REPO_ROOT}/.env.example" "$ENV_TARGET"
  chmod 600 "$ENV_TARGET"
  log "권한 600 설정 완료: $ENV_TARGET"
fi

# ─── 3. cloudflared config 복사 ──────────────────────
CFD_TARGET="${DATA_ROOT}/cloudflared/config.yml"
if [[ -f "$CFD_TARGET" ]]; then
  warn "cloudflared/config.yml 이 이미 존재합니다. 건너뜁니다."
else
  log "cloudflared/config.example.yml → config.yml 복사..."
  cp "${REPO_ROOT}/cloudflared/config.example.yml" "$CFD_TARGET"
  chmod 600 "$CFD_TARGET"
  log "권한 600 설정 완료: $CFD_TARGET"
fi

# ─── 4. backup.sh 복사 + 실행 권한 ───────────────────
BACKUP_TARGET="${DATA_ROOT}/scripts/backup.sh"
log "scripts/backup.sh 복사..."
cp "${REPO_ROOT}/scripts/backup.sh" "$BACKUP_TARGET"
chmod +x "$BACKUP_TARGET"

# ─── 5. docker-compose.yml 동기화 ────────────────────
log "docker-compose.yml 을 ${DATA_ROOT}/ 로 복사..."
cp "${REPO_ROOT}/docker-compose.yml" "${DATA_ROOT}/docker-compose.yml"

if [[ -d "${REPO_ROOT}/nginx" ]]; then
  log "nginx 설정 복사..."
  cp -r "${REPO_ROOT}/nginx" "${DATA_ROOT}/"
fi

# ─── 6. 이미지 pull ──────────────────────────────────
log "docker compose pull (이미지 사전 다운로드)..."
(cd "${DATA_ROOT}" && docker compose pull) || warn "pull 실패 — GHCR 인증 필요할 수 있음."

# ─── 7. 다음 단계 안내 ───────────────────────────────
cat <<'EOF'

════════════════════════════════════════════════════════
부트스트랩 완료. 다음 단계를 순서대로 진행하세요.
════════════════════════════════════════════════════════

1) 환경변수 채우기
   nano /data/saas-aed/.env.production
   - POSTGRES_PASSWORD       : openssl rand -base64 24
   - NEXTAUTH_SECRET         : openssl rand -base64 32
   - R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
   - RESEND_API_KEY
   - BACKUP_GPG_RECIPIENT
   - CLOUDFLARED_TOKEN       : cloudflared tunnel token <UUID>

2) Cloudflare Tunnel 자격증명 배치
   - cloudflared tunnel login
   - cloudflared tunnel create aed-tunnel
   - cloudflared tunnel route dns aed-tunnel aed.abada.co.kr
   - mv ~/.cloudflared/<UUID>.json /data/saas-aed/cloudflared/
   - chmod 600 /data/saas-aed/cloudflared/<UUID>.json
   - nano /data/saas-aed/cloudflared/config.yml  # tunnel UUID 채우기

3) gpg 키 등록 (백업 암호화용)
   gpg --import /path/to/ops-public.asc
   gpg --edit-key ops@abada.co.kr trust quit

4) 첫 기동
   cd /data/saas-aed
   docker compose up -d
   docker compose ps
   curl -fsS https://aed.abada.co.kr/api/health

5) systemd 백업 타이머 등록
   sudo cp systemd/aed-backup.service /etc/systemd/system/
   sudo cp systemd/aed-backup.timer   /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now aed-backup.timer

문서: docs/deployment/abada-65-setup.md
       docs/deployment/cloudflare-tunnel-setup.md
       docs/deployment/production-checklist.md
EOF
