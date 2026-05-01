# abada-65 운영 배포 가이드

> 본 문서는 **abada-65 자체 호스팅 서버**에 saas-aed(AED Inspection SaaS)를 처음부터 배포하는 절차를 정리한다.
> 모든 명령은 SSH 접속 후 서버에서 실행한다. 클라이언트(macOS/노트북)에서 실행해야 하는 명령은 `[로컬]` 표시.
>
> **데이터/설정 위치 규칙**: 모든 영속 데이터·설정은 `/data/saas-aed/` 하위에 둔다. `/home`·`/opt`·`/srv` 사용 금지.

---

## 0. 사전 조건

### 0-1. 서버 사양

| 항목 | 최소 | 권장 |
|------|------|------|
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| CPU | 4 vCPU | 8 vCPU |
| RAM | 8 GB | 16 GB |
| Disk | 100 GB SSD | 200 GB NVMe |
| Network | 100 Mbps | 1 Gbps |

### 0-2. 필수 소프트웨어 (root 권한으로 설치)

```bash
# 패키지 인덱스 갱신
sudo apt-get update && sudo apt-get upgrade -y

# 기본 도구
sudo apt-get install -y curl ca-certificates gnupg lsb-release \
  ufw fail2ban gpg jq htop tree

# Docker 24+ (공식 리포)
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# 버전 확인 (Docker 24+ 필수)
docker --version
docker compose version
```

### 0-3. 운영 사용자 계정 생성

> **보안 강조**: 모든 운영 작업은 `aedops` 계정으로 수행한다. root 직접 사용 금지.

```bash
# aedops 계정 생성 + Docker 그룹 가입
sudo useradd -m -s /bin/bash aedops
sudo usermod -aG docker aedops
sudo passwd aedops   # 강력한 비밀번호 설정

# sudo 권한 부여 (필요 명령만 NOPASSWD)
echo 'aedops ALL=(ALL) NOPASSWD: /usr/bin/systemctl, /usr/bin/docker, /usr/bin/docker compose' \
  | sudo tee /etc/sudoers.d/aedops
sudo chmod 0440 /etc/sudoers.d/aedops
```

---

## 1. SSH 접근 보안

### 1-1. SSH 키 등록 (`[로컬]`)

로컬 머신에서 키를 생성하고 서버로 복사한다.

```bash
# [로컬] ed25519 키 생성 (없는 경우)
ssh-keygen -t ed25519 -C "saas-aed@abada-65" -f ~/.ssh/abada-65_ed25519

# [로컬] 공개키를 서버 aedops 계정으로 복사
ssh-copy-id -i ~/.ssh/abada-65_ed25519.pub aedops@<abada-65-IP>
```

### 1-2. sshd 설정 강화 (`[서버]`)

```bash
sudo nano /etc/ssh/sshd_config.d/99-hardening.conf
```

다음 내용으로 작성한다.

```conf
# /etc/ssh/sshd_config.d/99-hardening.conf
Port 22022                      # 기본 22 포트 변경 권장
PermitRootLogin no              # root 직접 로그인 금지
PasswordAuthentication no       # 키 인증만 허용
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
AllowUsers aedops               # aedops 계정만 접근
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
LoginGraceTime 30
```

적용:

```bash
# 설정 검증
sudo sshd -t

# 재시작
sudo systemctl restart ssh

# 새 포트로 접속 확인 (이전 세션 닫지 말 것!)
# [로컬] ssh -p 22022 -i ~/.ssh/abada-65_ed25519 aedops@<abada-65-IP>
```

### 1-3. 방화벽 (UFW)

```bash
# 기본 정책: deny incoming, allow outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 변경된 SSH 포트만 개방
sudo ufw allow 22022/tcp comment 'SSH'

# Cloudflare Tunnel 사용 시 80/443 외부 개방 불필요
# (만약 직접 노출이 필요하다면 Cloudflare IP만 허용)

sudo ufw enable
sudo ufw status verbose
```

### 1-4. fail2ban 활성화

```bash
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

`[sshd]` 섹션을 다음과 같이 조정.

```ini
[sshd]
enabled = true
port = 22022
maxretry = 3
findtime = 10m
bantime = 1h
```

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

---

## 2. /data/saas-aed/ 디렉토리 구조

```
/data/saas-aed/
├── .env.production            # 환경변수 (chmod 600 필수)
├── docker-compose.yml         # 배포 시 git clone 또는 직접 복사
├── postgres/                  # PostgreSQL 데이터
├── redis/                     # Redis AOF
├── backup/                    # 일일 DB 덤프 (gpg 암호화)
├── nginx-cache/               # nginx fastcgi/proxy 캐시
├── cloudflared/
│   ├── config.yml             # 터널 라우팅 설정
│   └── <UUID>.json            # 터널 자격증명 (chmod 600)
└── scripts/
    └── backup.sh              # 일일 백업 (systemd timer로 호출)
```

부트스트랩(자동):

```bash
# 저장소 clone (또는 rsync로 docker-compose.yml/scripts/만 동기화)
sudo mkdir -p /data/saas-aed
sudo chown -R aedops:aedops /data/saas-aed

# aedops 사용자로 전환
sudo -iu aedops

cd /data/saas-aed
git clone https://github.com/saintgo7/saas-aed.git src
cd src

# 부트스트랩 스크립트 실행 (디렉토리 생성 + 템플릿 복사)
bash scripts/deploy-bootstrap.sh
```

권한 검증:

```bash
ls -ld /data/saas-aed
# drwxr-xr-x  aedops aedops

ls -l /data/saas-aed/.env.production
# -rw------- (600) — aedops만 읽기/쓰기
```

---

## 3. .env.production 작성

> **보안 강조**: `.env.production`에는 모든 시크릿이 들어간다. 절대 git에 커밋 금지. `chmod 600` 필수.

```bash
cd /data/saas-aed
cp src/.env.example .env.production
chmod 600 .env.production
nano .env.production
```

각 변수의 의미와 생성 방법은 다음과 같다.

| 변수 | 설명 | 생성 방법 |
|------|------|-----------|
| `DATABASE_URL` | PostgreSQL 접속 URL | `postgresql://aed:<POSTGRES_PASSWORD>@postgres:5432/aed` |
| `POSTGRES_USER` | DB 사용자 | 기본 `aed` |
| `POSTGRES_PASSWORD` | DB 비밀번호 | `openssl rand -base64 24` |
| `POSTGRES_DB` | DB 이름 | 기본 `aed` |
| `REDIS_URL` | Redis 접속 URL | `redis://redis:6379` (compose 내부) |
| `NEXTAUTH_SECRET` | Auth.js 세션 서명 키 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 인증 콜백 URL | `https://aed.abada.co.kr` |
| `AUTH_TRUST_HOST` | 프록시 뒤 호스트 신뢰 | `true` |
| `R2_ACCOUNT_ID` | Cloudflare 계정 ID | Cloudflare 대시보드 → R2 → Manage R2 API Tokens |
| `R2_ACCESS_KEY_ID` | R2 액세스 키 | Cloudflare R2 → Create API token |
| `R2_SECRET_ACCESS_KEY` | R2 시크릿 키 | 동일 |
| `R2_BUCKET` | 검사 자료 버킷 | 예: `aed-inspection` |
| `R2_PUBLIC_URL` | R2 퍼블릭 도메인 | 예: `https://r2.aed.abada.co.kr` |
| `RESEND_API_KEY` | Resend 트랜잭션 메일 | Resend 콘솔에서 발급 (`re_...`) |
| `RESEND_FROM` | 발신 주소 | `noreply@aed.abada.co.kr` |
| `BACKUP_GPG_RECIPIENT` | 백업 암호화 수신자 | gpg 공개키 등록된 이메일 |
| `BACKUP_R2_BUCKET` | 백업 저장 버킷 | 예: `aed-backup` |
| `CLOUDFLARED_TOKEN` | 터널 토큰(선택) | `cloudflared tunnel token <UUID>` |
| `APP_TAG` | 배포 이미지 태그 | 기본 `latest`, CI에서 SHA로 덮어쓰기 |

생성 예시:

```bash
# 강력한 시크릿 일괄 생성
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
```

---

## 4. gpg 키 설정 (백업 암호화)

```bash
# aedops 계정에서 키 생성 또는 import
gpg --full-generate-key       # 신규 생성 시
# 또는 기존 공개키 import
gpg --import /path/to/ops-public.asc

# 신뢰 수준 설정
gpg --edit-key ops@abada.co.kr trust quit
```

`.env.production`의 `BACKUP_GPG_RECIPIENT`에 같은 이메일을 넣는다.

---

## 5. cloudflared 설치 + 터널 생성

상세 절차는 [`cloudflare-tunnel-setup.md`](./cloudflare-tunnel-setup.md) 참고. 요약:

```bash
# Linux x86_64 바이너리 설치
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Cloudflare 인증 (브라우저 열림)
cloudflared tunnel login

# 터널 생성 (UUID + ~/.cloudflared/<UUID>.json 생성됨)
cloudflared tunnel create aed-tunnel

# DNS 라우팅
cloudflared tunnel route dns aed-tunnel aed.abada.co.kr

# credentials를 /data/saas-aed/cloudflared/로 이동
mkdir -p /data/saas-aed/cloudflared
cp ~/.cloudflared/<UUID>.json /data/saas-aed/cloudflared/
chmod 600 /data/saas-aed/cloudflared/<UUID>.json

# config.yml 작성
cp /data/saas-aed/src/cloudflared/config.example.yml \
   /data/saas-aed/cloudflared/config.yml
nano /data/saas-aed/cloudflared/config.yml
# tunnel: <UUID>
# credentials-file: /etc/cloudflared/<UUID>.json
```

---

## 6. 첫 배포 실행

```bash
cd /data/saas-aed/src

# 이미지 pull (GitHub Container Registry)
docker compose pull

# 백그라운드 기동
docker compose up -d

# 컨테이너 상태 확인
docker compose ps
```

기대 결과: 모든 서비스 `Up (healthy)`.

```
NAME              STATUS              PORTS
aed-postgres      Up 30s (healthy)
aed-redis         Up 30s (healthy)
aed-app           Up 20s (healthy)
aed-cron          Up 20s
aed-nginx         Up 10s
aed-cloudflared   Up 10s
```

---

## 7. 헬스체크

### 7-1. 내부 헬스체크

```bash
# 컨테이너 내부에서 직접 호출
docker exec aed-app node -e "fetch('http://localhost:3000/api/health').then(r=>r.json()).then(console.log)"

# nginx → app 라우팅 확인
docker exec aed-nginx wget -qO- http://app:3000/api/health
```

### 7-2. 외부 헬스체크 (Cloudflare Tunnel 통과)

```bash
curl -fsS https://aed.abada.co.kr/api/health | jq .
# 기대: {"status":"ok","timestamp":"..."}
```

### 7-3. 로그 확인

```bash
# 실시간 전체 로그
docker compose logs -f

# 특정 서비스
docker compose logs -f app
docker compose logs -f cloudflared

# 최근 100줄
docker compose logs --tail=100 app
```

---

## 8. systemd 백업 타이머 등록

```bash
# unit 파일 복사
sudo cp /data/saas-aed/src/systemd/aed-backup.service /etc/systemd/system/
sudo cp /data/saas-aed/src/systemd/aed-backup.timer /etc/systemd/system/

# scripts/backup.sh 위치 정합성 확인
ls -l /data/saas-aed/scripts/backup.sh

# 활성화
sudo systemctl daemon-reload
sudo systemctl enable --now aed-backup.timer

# 다음 실행 시각 확인
systemctl list-timers aed-backup.timer
```

---

## 9. 운영 체크리스트

배포 직후 한 번, 그 후 주 1회 점검한다.

- [ ] `chmod 600 /data/saas-aed/.env.production` 확인
- [ ] `chmod 600 /data/saas-aed/cloudflared/<UUID>.json` 확인
- [ ] `ufw status`에서 22022 외 포트 차단 확인
- [ ] `sudo fail2ban-client status sshd` jail 활성 확인
- [ ] `docker compose ps` 모든 컨테이너 healthy
- [ ] `curl https://aed.abada.co.kr/api/health` 외부 200 OK
- [ ] `systemctl list-timers aed-backup.timer` 다음 실행 < 24h
- [ ] `/data/saas-aed/backup/` 최신 파일 < 24h 이내
- [ ] `df -h /data` 사용률 < 70%
- [ ] `docker system df` 이미지/볼륨 점검 (월 1회 prune 권장)
- [ ] gpg 키 만료일 확인 (`gpg --list-keys`)
- [ ] Cloudflare 대시보드 → Tunnel 상태 `HEALTHY`
- [ ] R2 버킷 객체 개수·용량 추이 점검

---

## 10. 자주 발생하는 문제

### 10-1. `docker compose pull` 인증 실패

GHCR 프라이빗 이미지인 경우 PAT 로그인이 필요하다.

```bash
echo $GHCR_TOKEN | docker login ghcr.io -u saintgo7 --password-stdin
```

### 10-2. cloudflared `connection refused`

`docker compose ps`에서 `nginx`가 healthy인지 먼저 확인. `cloudflared/config.yml`의 `service: http://nginx:80`이 compose 네트워크 이름과 일치해야 한다.

### 10-3. PostgreSQL `out of shared memory`

`docker-compose.yml`의 postgres 서비스에 `shm_size: '256mb'`를 추가.

---

## 부록: 디렉토리 권한 한 줄 점검

```bash
sudo find /data/saas-aed -maxdepth 2 \( -name '.env*' -o -name '*.json' \) \
  -exec stat -c '%a %U %n' {} \;
# 모두 `600 aedops`이어야 함
```
