---
title: "13장. Docker Compose + Cloudflare Tunnel 배포"
slug: "deploy"
chapter: 13
words_target: 4000
screenshots:
  - ch13-step01-server-fresh-ubuntu
  - ch13-step02-docker-install
  - ch13-step03-clone-repo-env
  - ch13-step04-cloudflared-token-setup
  - ch13-step05-compose-up-all-healthy
  - ch13-step06-public-url-first-200
  - ch13-step07-github-actions-deploy-yml
  - ch13-step08-abada65-directory-tree
  - ch13-step09-host-cloudflared-config
  - ch13-step10-port-slot-10370
---

# 13장. Docker Compose + Cloudflare Tunnel 배포

## 학습 목표

- 깨끗한 Ubuntu 22.04 서버에서 본 SaaS 를 30분 안에 배포한다
- Docker + Compose v2 + cloudflared 의 기본 설치 절차를 수행한다
- `.env.production` 의 핵심 25개 변수를 설정한다
- GitHub Actions 로 무인 배포 파이프라인을 구성한다
- 첫 트래픽 200 응답을 외부에서 검증한다

## 핵심 개념

배포는 신비롭지 않다. 잘 정리된 30개 셀의 셸 스크립트일 뿐이다. 이 장에서는
실제 명령을 그대로 따라 칠 수 있도록 한 줄 한 줄 캡처와 함께 정리한다.

<!-- SCREENSHOT: ch13-step01-server-fresh-ubuntu -->
![새 Ubuntu 22.04 서버 — uname / df / free 결과](../assets/screenshots/ch13-step01-server-fresh-ubuntu.png)
*그림 13-1. 갓 받은 서버. 디스크 200GB, 메모리 8GB, 커널 5.15. 이 상태에서 시작한다.*
<!-- /SCREENSHOT -->

## 13.1 Docker 설치

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
docker compose version
```

<!-- SCREENSHOT: ch13-step02-docker-install -->
![Docker 설치 결과 — docker compose version 25.x](../assets/screenshots/ch13-step02-docker-install.png)
*그림 13-2. Docker 25.x, Compose v2 확인.*
<!-- /SCREENSHOT -->

## 13.2 저장소 클론 + 환경변수

```bash
sudo mkdir -p /data/aed
sudo chown $USER:$USER /data/aed
cd /data/aed
git clone https://github.com/saintgo7/saas-aed.git .
cp .env.example .env.production
$EDITOR .env.production   # 부록 B 환경변수 25개 채움
```

<!-- SCREENSHOT: ch13-step03-clone-repo-env -->
![.env.production 핵심 변수 작성 — 시크릿은 모자이크](../assets/screenshots/ch13-step03-clone-repo-env.png)
*그림 13-3. VS Code Remote SSH 로 본 .env.production. 시크릿 값은 캡처 시 모자이크 처리 (캡처 워크플로우 4절 참조).*
<!-- /SCREENSHOT -->

## 13.3 Cloudflare Tunnel 토큰

```bash
# Cloudflare Dashboard → Zero Trust → Networks → Tunnels → Create
# Tunnel token 발급 → .env.production 의 CLOUDFLARED_TOKEN 에 박음
```

<!-- SCREENSHOT: ch13-step04-cloudflared-token-setup -->
![Cloudflare Zero Trust — Tunnel 생성 화면](../assets/screenshots/ch13-step04-cloudflared-token-setup.png)
*그림 13-4. Tunnel 생성 후 받는 docker run 명령에서 --token 뒤 값만 추출해 환경변수로.*
<!-- /SCREENSHOT -->

## 13.4 첫 기동

```bash
docker compose --env-file .env.production up -d
docker compose ps
```

<!-- SCREENSHOT: ch13-step05-compose-up-all-healthy -->
![docker compose ps — 6개 컨테이너 모두 healthy](../assets/screenshots/ch13-step05-compose-up-all-healthy.png)
*그림 13-5. 첫 기동 후 1분. 모든 컨테이너가 healthy 면 다음 단계로.*
<!-- /SCREENSHOT -->

## 13.5 첫 트래픽 검증

```bash
curl -sS https://aed.example.kr/healthz
# ok
```

<!-- SCREENSHOT: ch13-step06-public-url-first-200 -->
![외부에서 본 첫 200 — 본인 노트북 터미널 + 브라우저](../assets/screenshots/ch13-step06-public-url-first-200.png)
*그림 13-6. 노트북에서 curl 200 + 브라우저에서 로그인 화면. 인바운드 포트 0인데 외부에서 닿는 마법.*
<!-- /SCREENSHOT -->

## 13.6 GitHub Actions 무인 배포

```yaml
# .github/workflows/deploy.yml (요약)
on: { push: { branches: [main] } }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: webfactory/ssh-agent@v0.9.0
      - run: ssh deploy@abada-65 "cd /data/aed && git pull && docker compose pull && docker compose up -d"
      - run: |
          for i in 1 2 3 4 5; do
            sleep 10
            curl -fsS https://aed.example.kr/healthz && exit 0
          done
          exit 1
```

<!-- SCREENSHOT: ch13-step07-github-actions-deploy-yml -->
![GitHub Actions 실행 로그 — 헬스체크 통과](../assets/screenshots/ch13-step07-github-actions-deploy-yml.png)
*그림 13-7. push → 3분 → 200. 헬스체크 5회 재시도가 마이그레이션 동안의 콜드 스타트를 흡수한다.*
<!-- /SCREENSHOT -->

### 13.6.1 배포 대형 사고 1차 — Node.js wget

처음에는 nginx healthcheck 를 BusyBox `wget` 으로 했다가 실패했다. 결국 Node.js
한 줄로 교체. (참고: `49a1976`, `f79a3b1` 커밋)

운영 첫 배포에서 마주친 7가지 함정과 패치는 부록 E에 사례별로 정리했다 —
Cloudflare 1년 캐시, GitHub Actions 5회 연속 실패, 페이지 redirect 누락,
Server Component 에러, 시드 unique 충돌, standalone 컨테이너의 0.0.0.0 leak,
git pull stash 워크플로우. 본 장이 "조립 설명서"라면 부록 E는 "조립 직후
응급실 일지"다.

## 13.7 abada-65 디렉토리·포트·터널 컨벤션 (실 배포 표준)

본 SaaS는 abada-65 호스트에서 다른 SaaS 프로젝트와 함께 운영된다. 호스트의
일관된 컨벤션이 정착됐고, 본 SaaS도 이를 그대로 따른다.

### 13.7.1 디렉토리 레이아웃

```
/data/
├── abada-kr/
│   ├── aed-abada-kr/
│   │   └── aed.abada.kr/         ← 본 SaaS
│   │       ├── docker-compose.yml
│   │       ├── .env              ← 600 mode, blackpc 소유
│   │       ├── src/              ← Next.js 앱
│   │       └── data/
│   │           ├── postgres/     ← 상대 bind mount
│   │           └── redis/
│   └── k-guide-abada-kr/
│       └── k-guide.abada.kr/
└── infra-config/
    └── projects/.../docker-compose.yml   ← compose mirror
```

규칙은 단순하다 — `/data/{org}/{name}-{org}/{full-domain}/`. 한 개 호스트에
여러 SaaS가 공존할 때 충돌을 막는 가장 결정적인 보호선. `/home`은 사용 금지
(다른 SaaS 메모리에서 `~/`로 접근 시 누설 위험).

<!-- SCREENSHOT: ch13-step08-abada65-directory-tree -->
![/data/abada-kr/.../aed.abada.kr 트리 출력](../assets/screenshots/ch13-step08-abada65-directory-tree.png)
*그림 13-8. abada-65 호스트의 `tree -L 3 /data/abada-kr/aed-abada-kr` 결과. 한 SaaS가 한 폴더에 깔끔히 떨어진다.*
<!-- /SCREENSHOT -->

### 13.7.2 포트 슬롯 — 10xxx 컨벤션 + 127.0.0.1 바인딩

본 SaaS는 `127.0.0.1:10370 → app:3000`. 컨테이너 외부로는 노출되지 않고,
오직 호스트 cloudflared만 접근. 포트 슬롯 10371은 staging-aed, 10372는 향후
split-api로 예약.

```yaml
# docker-compose.yml (요약)
services:
  app:
    ports:
      - "127.0.0.1:10370:3000"   # 외부 미노출
    networks: [aed-prod-net]
  postgres:
    # ports 미노출 — 같은 네트워크 내부만
    networks: [aed-prod-net]
  redis:
    networks: [aed-prod-net]

networks:
  aed-prod-net:
    name: aed-prod-net
```

postgres/redis는 외부 노출 자체가 없다. 같은 docker network(`aed-prod-net`)
안의 app 컨테이너만 접근. 13장 초기 버전의 nginx + cloudflared in-compose는
**제거**됐다 — 호스트 레벨 cloudflared가 진실의 원천.

<!-- SCREENSHOT: ch13-step10-port-slot-10370 -->
![ss -tnlp | grep 10370 — 127.0.0.1만 listen](../assets/screenshots/ch13-step10-port-slot-10370.png)
*그림 13-9. 호스트에서 `ss -tnlp`로 본 포트 바인딩. `0.0.0.0`이 아니라 `127.0.0.1`만 listen.*
<!-- /SCREENSHOT -->

### 13.7.3 호스트 레벨 cloudflared 단일 터널

cloudflared는 컨테이너로 운영하지 않는다. 호스트의 systemd 단일 터널이 모든
SaaS의 ingress를 처리한다.

```yaml
# /etc/cloudflared/config.yml (요약)
tunnel: e8e3c4a4-...
credentials-file: /etc/cloudflared/e8e3c4a4-....json

ingress:
  - hostname: aed.abada.kr
    service: http://localhost:10370
  - hostname: k-guide.abada.kr
    service: http://localhost:10380
  - service: http_status:404
```

새 SaaS 추가 시 ingress 한 줄만 추가하고 `systemctl reload cloudflared`. 본
SaaS의 docker-compose에는 cloudflared가 없다(`23c765b` 커밋에서 분리).

<!-- SCREENSHOT: ch13-step09-host-cloudflared-config -->
![호스트 cloudflared config — 단일 터널 다중 ingress](../assets/screenshots/ch13-step09-host-cloudflared-config.png)
*그림 13-10. /etc/cloudflared/config.yml. 한 터널이 호스트의 모든 SaaS 도메인을 라우팅.*
<!-- /SCREENSHOT -->

### 13.7.4 .env 파일명과 Compose v1 호환

기존 `.env.production`을 abada-65 컨벤션에 맞춰 `.env`로 통일. 또한 Compose
v2/v1 호환을 위해 명령은 `docker compose` (v2) 우선, 실패 시 `docker-compose`
(v1) 폴백 패턴을 권장. 실 배포에서 마주친 호스트는 두 버전이 혼재한다.

```bash
docker compose --env-file .env up -d 2>/dev/null || \
docker-compose --env-file .env up -d
```

## 13.8 롤백

```bash
docker compose down
git checkout v1.4.2
docker compose up -d
```

이미지를 git tag 와 1:1 매핑해 두면 롤백이 30초로 끝난다.

## 요약

- 30개 셀의 셸 스크립트 = 배포의 본질
- Cloudflare Tunnel 토큰 한 줄로 인바운드 포트 0
- nginx healthz 분리 + 헬스체크 5회 재시도 = 콜드 스타트 흡수
- GitHub Actions 로 push → 3분 → 200 의 무인 파이프라인

## 다음 장 미리보기

다음 장에서는 일 1회 백업, gpg 암호화, R2 미러라는 운영의 진짜 보험을 어떻게
세팅했는지, 그리고 복구 리허설을 6개월에 한 번 하는 이유를 다룬다.

## 캡처 체크리스트

- [ ] `ch13-step01-server-fresh-ubuntu.png`
- [ ] `ch13-step02-docker-install.png`
- [ ] `ch13-step03-clone-repo-env.png` — 시크릿 모자이크
- [ ] `ch13-step04-cloudflared-token-setup.png` — 토큰 모자이크
- [ ] `ch13-step05-compose-up-all-healthy.png`
- [ ] `ch13-step06-public-url-first-200.png`
- [ ] `ch13-step07-github-actions-deploy-yml.png`
- [ ] `ch13-step08-abada65-directory-tree.png` — abada-65 디렉토리 컨벤션
- [ ] `ch13-step09-host-cloudflared-config.png` — 호스트 cloudflared 단일 터널
- [ ] `ch13-step10-port-slot-10370.png` — 127.0.0.1:10370 바인딩
