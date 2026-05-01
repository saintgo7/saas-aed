# 운영 배포 체크리스트 (Production Checklist)

> abada-65에 saas-aed를 처음 띄우거나, 메이저 변경을 푸시하기 전에 처음부터 끝까지 체크.
> 각 항목 옆 명령어를 그대로 실행해 검증한다 — "확인했음"이 아니라 "출력이 이렇다"여야 한다.

---

## A. 환경변수 / 시크릿 (12)

- [ ] `/data/saas-aed/.env.production` 존재
  - `ls -l /data/saas-aed/.env.production`
- [ ] `.env.production` 권한 `-rw------- (600)` 이고 소유자 `aedops`
  - `stat -c '%a %U %G' /data/saas-aed/.env.production`
- [ ] `POSTGRES_PASSWORD` 설정됨 + 24자 이상
- [ ] `NEXTAUTH_SECRET` 설정됨 + base64 32바이트
- [ ] `NEXTAUTH_URL=https://aed.abada.co.kr` (https 필수)
- [ ] `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` 모두 채워짐
- [ ] `R2_BUCKET=aed-inspection`, 버킷 실제 존재 (Cloudflare 대시보드)
- [ ] `RESEND_API_KEY` 채워짐 + Resend 콘솔에서 도메인 검증 완료
- [ ] `RESEND_FROM=noreply@aed.abada.co.kr`
- [ ] `BACKUP_GPG_RECIPIENT` 이메일 — gpg 공개키 import 됨
- [ ] `BACKUP_R2_BUCKET=aed-backup` — 별도 버킷 실제 존재
- [ ] `CLOUDFLARED_TOKEN` (토큰 방식 사용 시) 등록됨

## B. SSL / DNS / 네트워크 (8)

- [ ] DNS A/CNAME: `aed.abada.co.kr` → `<UUID>.cfargotunnel.com` (Proxied)
  - `dig aed.abada.co.kr CNAME +short`
- [ ] DNS 전파 확인 (1.1.1.1, 8.8.8.8 모두)
- [ ] Cloudflare SSL 모드: **Full (strict)** 또는 최소 **Full**
- [ ] Cloudflare Origin Cert 발급 (직접 노출 시) — Tunnel 사용 시 생략 가능
- [ ] HSTS 활성 (Cloudflare → SSL/TLS → Edge Certificates)
- [ ] WAF 룰 활성 (`Cloudflare Managed Ruleset` 최소)
- [ ] Bot Fight Mode `On`
- [ ] Rate limiting 룰: `/api/auth/*` 분당 10회

## C. Cloudflare Tunnel (5)

- [ ] `cloudflared tunnel list`에 `aed-tunnel` 표시됨
- [ ] `/data/saas-aed/cloudflared/<UUID>.json` 권한 600
- [ ] `/data/saas-aed/cloudflared/config.yml` 권한 600 + UUID 일치
- [ ] `docker compose ps cloudflared` healthy
- [ ] Cloudflare 대시보드 → Zero Trust → Tunnels → 상태 `HEALTHY`

## D. Docker 스택 (8)

- [ ] `docker compose ps` 모든 서비스 `Up (healthy)`
  ```
  aed-postgres    Up (healthy)
  aed-redis       Up (healthy)
  aed-app         Up (healthy)
  aed-cron        Up
  aed-nginx       Up
  aed-cloudflared Up
  ```
- [ ] `docker compose logs --tail=50 app` 에러 없음
- [ ] `docker compose logs --tail=50 cron-worker` 큐 연결 성공 메시지
- [ ] `docker compose logs --tail=50 cloudflared` `Registered tunnel connection` 표시
- [ ] PostgreSQL 마이그레이션 적용됨
  - `docker exec aed-postgres psql -U aed -d aed -c "\dt"` 테이블 존재
- [ ] Redis 응답 OK
  - `docker exec aed-redis redis-cli ping` → `PONG`
- [ ] 이미지 태그가 의도한 git SHA 또는 `latest`
  - `docker compose images`
- [ ] `docker system df` 사용량 적정 (월 1회 prune)

## E. 헬스체크 / 동작 검증 (7)

- [ ] 외부 헬스체크 200 OK
  - `curl -fsS https://aed.abada.co.kr/api/health | jq .`
- [ ] HTTP → HTTPS 리다이렉트 (Cloudflare Always Use HTTPS)
- [ ] 메인 페이지 200 OK
  - `curl -fsS -o /dev/null -w '%{http_code}\n' https://aed.abada.co.kr/`
- [ ] `/api/auth/csrf` 응답 정상
- [ ] 로그인 매직링크 발송 → 수신 → 클릭 정상 (수동)
- [ ] 첫 inspection 등록 → 저장 성공
- [ ] R2 업로드 동작 (이미지 첨부 케이스) — 실제 객체 R2 콘솔에서 확인

## F. 백업 / 복구 (6)

- [ ] gpg 키 import + 신뢰 설정됨
  - `gpg --list-keys $BACKUP_GPG_RECIPIENT`
- [ ] `/data/saas-aed/scripts/backup.sh` 실행 권한
- [ ] `aed-backup.timer` enabled + 다음 실행 < 24h
  - `systemctl list-timers aed-backup.timer`
- [ ] 수동 백업 1회 성공 + R2에 객체 업로드 확인
  - `sudo systemctl start aed-backup.service`
  - `sudo journalctl -u aed-backup.service -n 50`
- [ ] 복구 시뮬레이션 (스테이징 DB로) 성공 — `rollback.md` §3 참고
- [ ] 백업 보존 정책: 로컬 30일, R2 90일 적용 (lifecycle rule)

## G. 보안 (10)

- [ ] SSH PasswordAuthentication=no, PermitRootLogin=no
  - `sudo grep -E '^(PasswordAuthentication|PermitRootLogin)' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf`
- [ ] SSH 포트 22 미사용 (변경됨)
- [ ] `ufw status` active + 22022만 허용
- [ ] `fail2ban-client status sshd` jail active
- [ ] `aedops` 계정 sudo는 systemctl/docker만
- [ ] 하드코딩된 시크릿 없음 (저장소 git grep으로 확인)
  - `git grep -nE 'sk_live|secret|password' -- ':!*.example' ':!*.md'`
- [ ] `.env.production`이 `.gitignore`에 포함됨
- [ ] HTTPS 외부 차단 — `curl http://aed.abada.co.kr` → 301 또는 차단
- [ ] CSRF 토큰 활성 (Auth.js 기본)
- [ ] CSP 헤더 설정 (nginx 또는 Next.js middleware)

## H. GitHub Actions (5)

- [ ] `ABADA65_HOST`, `ABADA65_USER`, `ABADA65_PORT`, `ABADA65_SSH_KEY` 모두 등록
  - `gh secret list -R saintgo7/saas-aed`
- [ ] `.github/workflows/deploy.yml`에 environment `production` 보호 룰 활성 (수동 승인)
- [ ] CI green: typecheck, lint, test 모두 통과
  - `gh run list -R saintgo7/saas-aed --limit 5`
- [ ] GHCR 이미지 push 성공 (latest + SHA 태그)
- [ ] Deploy workflow dry-run으로 SSH 접속 단계까지 통과

## I. 모니터링 / 알림 (5)

- [ ] Cloudflare Analytics 활성 (Web Analytics 또는 Pro)
- [ ] 외부 uptime 모니터 등록 (UptimeRobot 또는 Healthchecks.io)
  - `https://aed.abada.co.kr/api/health` 5분 간격
- [ ] Slack/이메일 알림 채널 설정 + 테스트 알림 도달 확인
- [ ] `docker compose logs` 누적량 점검 — log rotation 설정
  - `/etc/docker/daemon.json` 에 `log-opts: max-size=50m, max-file=3`
- [ ] 디스크 사용 알림 (>80%) — 호스트 cron 또는 외부 모니터

## J. 운영 문서 / 사람 (4)

- [ ] 배포 책임자/연락처 PIC 명확
- [ ] 사용자 통신 템플릿 준비 (`rollback.md` 부록)
- [ ] 운영 위키/노션에 본 체크리스트 링크 등록
- [ ] 신규 입사자용 SSH 키 등록 절차 정리

## K. 인스펙션 E2E 검증 (5)

> 모든 인프라 OK 이후, 실제 도메인 워크플로우 1회 통과를 마지막 게이트로 둔다.

- [ ] 회원가입(매직링크) → 로그인 → 대시보드 진입
- [ ] 신규 inspection 생성 → 사진 업로드 → 저장
- [ ] cron-worker 1회 실행 결과 확인 (스케줄 작업 결과 메일/알림)
- [ ] PDF 리포트 생성 + 다운로드 정상
- [ ] 로그아웃 → 인증 만료 동작 정상

---

## 최종 게이트

위 항목 중 하나라도 미체크면 **운영 배포 보류**. "이 정도면 됐다"는 금지어.
모두 체크 완료 후, `docs/deployment/rollback.md`를 1회 통독하고 배포 진행.
