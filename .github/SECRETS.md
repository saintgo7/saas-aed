# GitHub Actions Secrets

> **보안 강조**: 본 문서에 시크릿 *값*을 적지 않는다. 키 이름과 등록 방법만 정리한다.
> 실제 값은 GitHub UI에서만 입력하고, 평문 복사본을 로컬에 남기지 않는다.

`saintgo7/saas-aed` 저장소의 **Settings → Secrets and variables → Actions**에 등록.

---

## 1. 필수 Secrets

| 이름 | 설명 | 예시 / 형식 | 출처 |
|------|------|-------------|------|
| `ABADA65_HOST` | abada-65 서버 호스트명 또는 IP | `abada-65.abada.co.kr` 또는 `203.0.113.10` | 인프라팀 |
| `ABADA65_USER` | SSH 접속 계정 | `aedops` | 운영 가이드 §0-3 |
| `ABADA65_PORT` | SSH 포트 (변경했다면) | `22022` (기본 22 미사용 권장) | sshd 설정 |
| `ABADA65_SSH_KEY` | 프라이빗 키 PEM 전체 | `-----BEGIN OPENSSH PRIVATE KEY-----`로 시작하는 전체 텍스트 | `~/.ssh/abada-65_ed25519` |

### 1-1. SSH 키 등록 절차

```bash
# 로컬에서 배포 전용 키 생성 (별도 키 권장 — 개인 키 재사용 금지)
ssh-keygen -t ed25519 -C "github-actions@saas-aed" \
  -f ~/.ssh/saas-aed-deploy_ed25519 -N ""

# 공개키를 abada-65 서버 aedops 계정에 등록
ssh-copy-id -i ~/.ssh/saas-aed-deploy_ed25519.pub \
  -p 22022 aedops@abada-65.abada.co.kr

# 프라이빗 키 내용을 클립보드에 복사
cat ~/.ssh/saas-aed-deploy_ed25519
# → 출력 전체를 GitHub Secrets `ABADA65_SSH_KEY`에 붙여넣기
```

> **중요**: 줄바꿈 포함 PEM 전체를 그대로 붙여넣어야 한다. 마지막 `-----END ...-----` 다음 개행도 포함.

---

## 2. 자동 제공 Secrets (등록 불필요)

| 이름 | 설명 | 비고 |
|------|------|------|
| `GITHUB_TOKEN` | Actions 기본 토큰 (GHCR push 권한 포함) | `permissions: { packages: write }` 설정 시 사용 가능 |
| `GHCR_TOKEN` | (선택) GHCR 별도 PAT — 외부 레지스트리 사용 시 | 본 프로젝트는 `GITHUB_TOKEN`으로 충분 |

GHCR 별도 PAT가 필요한 경우(예: 다른 organization 이미지를 pull):

1. GitHub → Settings → Developer settings → **Personal access tokens (classic)**
2. Scopes: `read:packages`, `write:packages`
3. 생성된 토큰을 `GHCR_TOKEN` Secret에 등록

---

## 3. 선택 Secrets (배포 자동화 확장)

| 이름 | 용도 |
|------|------|
| `SLACK_WEBHOOK_URL` | 배포 결과 Slack 알림 |
| `SENTRY_AUTH_TOKEN` | Sentry release 등록 |
| `CLOUDFLARE_API_TOKEN` | DNS/캐시 자동 purge |

---

## 4. Secret 추가 절차 (UI)

1. 저장소 페이지 → **Settings**
2. 좌측 메뉴 → **Secrets and variables** → **Actions**
3. 우측 상단 **New repository secret**
4. **Name**: 위 표의 이름 그대로 입력
5. **Secret**: 값 붙여넣기 → **Add secret**
6. 등록 후 값은 다시 볼 수 없음. 변경 시 **Update secret**.

CLI(`gh`) 사용:

```bash
# 단일 값
gh secret set ABADA65_HOST --body "abada-65.abada.co.kr"

# 파일에서 (SSH 키)
gh secret set ABADA65_SSH_KEY < ~/.ssh/saas-aed-deploy_ed25519
```

---

## 5. 보안 주의사항

- **저장소 fork 금지**: fork된 PR에서는 secrets가 노출되지 않지만, workflow가 secrets를 echo하면 로그에 남는다. `echo $SECRET` 절대 금지.
- **로컬 평문 보관 금지**: 등록 후 로컬 임시 파일/메모/슬랙 DM에서 제거.
- **키 회전 주기**: 90일마다 SSH 배포 키 재생성. (`/Users/saint/.claude/skills/rotate-keys` 참조)
- **권한 최소화**: `aedops` 계정에 sudo NOPASSWD를 줄 때 `systemctl`, `docker`, `docker compose` 외에는 부여 금지.
- **사고 발생 시**: 즉시 GitHub UI에서 Secret 삭제 → abada-65에서 `~/.ssh/authorized_keys`의 해당 공개키 제거 → 새 키 발급/등록.

---

## 6. 등록 검증 체크리스트

- [ ] `ABADA65_HOST` 등록 — `nslookup`으로 실제 도메인 검증됨
- [ ] `ABADA65_USER` = `aedops` (root 금지)
- [ ] `ABADA65_PORT` = sshd_config 일치
- [ ] `ABADA65_SSH_KEY` 등록 — 로컬에서 `ssh -i <키> -p <포트> aedops@<host>` 직접 접속 성공 확인
- [ ] `.github/workflows/deploy.yml`의 `secrets.*` 참조명이 위 표와 일치
- [ ] dry-run 워크플로우(`workflow_dispatch`)로 SSH 단계까지 통과 확인
