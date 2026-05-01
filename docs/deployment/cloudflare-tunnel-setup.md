# Cloudflare Tunnel 설정 가이드 (aed-tunnel)

> abada-65 서버를 외부에 직접 노출하지 않고 **Cloudflare Tunnel**로만 트래픽을 받는다.
> 도메인: `aed.abada.co.kr` → Cloudflare → cloudflared → nginx → Next.js app
>
> **보안 강조**: 서버의 80/443 포트를 인터넷에 직접 열지 않는다. 오직 Cloudflare 엣지에서만 접근 가능.

---

## 1. cloudflared CLI 설치 (Linux x86_64)

```bash
# 최신 .deb 패키지 다운로드
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# 설치
sudo dpkg -i cloudflared.deb

# 버전 확인
cloudflared --version
# 기대: cloudflared version 2024.x.x ...
```

ARM64 서버라면 `cloudflared-linux-arm64.deb`로 교체.

---

## 2. Cloudflare 계정 인증

```bash
cloudflared tunnel login
```

흐름:

1. 명령 실행 → 브라우저 URL 출력 + 자동 열림.
2. Cloudflare 로그인 → `abada.co.kr` zone 선택 → "Authorize" 클릭.
3. 인증 토큰이 `~/.cloudflared/cert.pem`에 저장됨.

```bash
ls -l ~/.cloudflared/cert.pem
# -rw------- (자동 600)
```

> **GUI 없는 서버**라면: 브라우저 URL을 수동으로 복사해 노트북에서 열고 인증 후, 받은 `cert.pem`을 `scp`로 서버에 옮긴다.

---

## 3. 터널 생성

```bash
cloudflared tunnel create aed-tunnel
```

출력 예시:

```
Tunnel credentials written to /home/aedops/.cloudflared/2f3a8e1c-....json.
Created tunnel aed-tunnel with id 2f3a8e1c-7b9d-4f2a-9e1c-1234567890ab
```

생성되는 파일:
- `~/.cloudflared/<UUID>.json` — 터널 자격증명 (절대 노출 금지, **chmod 600**)
- Cloudflare 대시보드의 Zero Trust → Networks → Tunnels에 등록됨.

UUID를 메모해 둔다. 이후 모든 명령에 사용된다.

```bash
TUNNEL_UUID="2f3a8e1c-7b9d-4f2a-9e1c-1234567890ab"
echo $TUNNEL_UUID
```

---

## 4. DNS 라우팅 (CNAME)

```bash
cloudflared tunnel route dns aed-tunnel aed.abada.co.kr
```

내부적으로 Cloudflare DNS에 다음 레코드를 자동 생성한다.

```
aed.abada.co.kr  CNAME  <UUID>.cfargotunnel.com  (Proxied)
```

확인:

```bash
dig aed.abada.co.kr CNAME +short
# <UUID>.cfargotunnel.com.
```

> **DNS 전파 지연**이 의심되면 1~5분 대기 후 재시도. Cloudflare는 일반적으로 60초 이내.

---

## 5. config.yml 작성

`/data/saas-aed/cloudflared/config.yml`에 다음과 같이 작성한다.

```yaml
# /data/saas-aed/cloudflared/config.yml
tunnel: 2f3a8e1c-7b9d-4f2a-9e1c-1234567890ab
credentials-file: /etc/cloudflared/2f3a8e1c-7b9d-4f2a-9e1c-1234567890ab.json

# Logging
loglevel: info
no-autoupdate: true

ingress:
  - hostname: aed.abada.co.kr
    service: http://nginx:80
    originRequest:
      connectTimeout: 30s
      noTLSVerify: false
      keepAliveConnections: 100
      keepAliveTimeout: 90s
  # Catch-all (필수)
  - service: http_status:404
```

자격증명 파일 이동:

```bash
mkdir -p /data/saas-aed/cloudflared
mv ~/.cloudflared/${TUNNEL_UUID}.json /data/saas-aed/cloudflared/
chmod 600 /data/saas-aed/cloudflared/${TUNNEL_UUID}.json
chmod 600 /data/saas-aed/cloudflared/config.yml
```

---

## 6. 실행 방식 — Docker vs systemd

### 6-1. Docker compose 방식 (현재 프로젝트의 기본)

장점:
- saas-aed 스택과 함께 `docker compose up -d` 한 번에 기동/중단.
- 컨테이너 네트워크(`aed-net`) 내부에서 `http://nginx:80` 직접 호출 가능.

단점:
- Docker 데몬이 죽으면 터널도 함께 죽음.

**토큰 방식**(이미 `docker-compose.yml`에 적용됨):

```bash
# 토큰 발급
cloudflared tunnel token ${TUNNEL_UUID}
# eyJhIjoi... (긴 JWT)

# .env.production에 등록
echo "CLOUDFLARED_TOKEN=eyJhIjoi..." >> /data/saas-aed/.env.production
```

`docker-compose.yml` 발췌:

```yaml
cloudflared:
  image: cloudflare/cloudflared:latest
  command: ["tunnel", "--no-autoupdate", "run", "--token", "${CLOUDFLARED_TOKEN}"]
```

**config.yml 방식** (더 세밀한 ingress 제어 필요 시):

```yaml
cloudflared:
  image: cloudflare/cloudflared:latest
  command: ["tunnel", "--no-autoupdate", "--config", "/etc/cloudflared/config.yml", "run"]
  volumes:
    - /data/saas-aed/cloudflared:/etc/cloudflared:ro
```

### 6-2. systemd 방식 (호스트 직접 실행)

Docker 의존을 제거하고 호스트에서 직접 실행. nginx만 Docker로 두는 하이브리드 구성도 가능.

```bash
# config 위치
sudo mkdir -p /etc/cloudflared
sudo cp /data/saas-aed/cloudflared/config.yml /etc/cloudflared/
sudo cp /data/saas-aed/cloudflared/${TUNNEL_UUID}.json /etc/cloudflared/

# 서비스 등록
sudo cloudflared service install

# 시작/활성화
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

| 항목 | Docker | systemd |
|------|--------|---------|
| 시작 단위 | docker compose 전체 | 단일 systemd unit |
| 네트워크 | compose 내부 DNS (nginx) | 호스트 포트 (`http://127.0.0.1:8080`) |
| 업그레이드 | image pull | apt upgrade |
| 권한 | docker user | root |
| 본 프로젝트 추천 | **이쪽** | (특수 케이스) |

---

## 7. 동작 검증

```bash
# 컨테이너 로그
docker compose logs -f cloudflared

# 기대 출력:
# Connection xxxx registered with protocol: quic
# Registered tunnel connection
```

브라우저로 `https://aed.abada.co.kr` 접속 → Next.js 페이지 표시.

```bash
curl -fsS -I https://aed.abada.co.kr/
# HTTP/2 200
# server: cloudflare
# cf-ray: ...
```

---

## 8. 트러블슈팅

### 8-1. DNS 전파가 안 될 때

```bash
# Cloudflare 측 레코드 직접 확인
dig @1.1.1.1 aed.abada.co.kr +short

# 다른 리졸버
dig @8.8.8.8 aed.abada.co.kr +short
```

- 5분 이상 결과가 다르면 Cloudflare 대시보드 → DNS → 레코드 존재 확인.
- 자동 생성 실패 시 수동 추가: `aed` CNAME `<UUID>.cfargotunnel.com` (Proxied: ON).

### 8-2. 502 Bad Gateway

원인 후보:

1. **nginx 컨테이너가 죽었음** → `docker compose ps` 확인.
2. **config.yml의 `service:` URL 오타** → `http://nginx:80` (compose service명 + 내부 포트).
3. **app health 실패** → `docker compose logs app | tail -50`.

빠른 점검:

```bash
docker exec aed-cloudflared cloudflared --version
docker exec aed-nginx wget -qO- http://app:3000/api/health
```

### 8-3. 인증 실패 (`Unauthorized`)

```bash
# 자격증명 파일 권한 확인
ls -l /data/saas-aed/cloudflared/*.json
# -rw------- (600), 소유자 aedops

# UUID 일치 확인
grep tunnel /data/saas-aed/cloudflared/config.yml
ls /data/saas-aed/cloudflared/*.json
# 두 UUID가 동일해야 함

# 토큰 방식 사용 중이라면 .env.production의 CLOUDFLARED_TOKEN 갱신
cloudflared tunnel token ${TUNNEL_UUID}
```

### 8-4. 터널이 자꾸 끊김

- 서버 시간 동기화 확인: `timedatectl status` → `NTP service: active`.
- MTU 이슈: `originRequest.connectTimeout: 30s` 추가, 또는 `--protocol http2`로 변경.

---

## 9. 터널 삭제 / 재생성

```bash
# 라우트 제거
cloudflared tunnel route dns --overwrite-dns aed-tunnel aed.abada.co.kr

# 터널 삭제 (실행 중인 connector 종료 후)
cloudflared tunnel delete aed-tunnel

# 재생성
cloudflared tunnel create aed-tunnel
cloudflared tunnel route dns aed-tunnel aed.abada.co.kr
```

> **주의**: 삭제는 즉시 트래픽 단절을 의미한다. 재생성 후 `<UUID>.json` 파일과 `config.yml`을 새 UUID로 갱신 필수.
