# 롤백 절차 (Rollback Playbook)

> 배포 실패 또는 운영 중 장애 발생 시 **5분 안에 이전 상태로 되돌리는** 절차.
> 본 문서는 abada-65 환경 기준이며, 모든 명령은 `aedops` 계정에서 `/data/saas-aed/`를 작업 디렉토리로 가정한다.

---

## 0. 판단 기준 — 언제 롤백하나

다음 중 하나라도 해당되면 **즉시 롤백**.

- 외부 헬스체크(`/api/health`) 5분 이상 200 미반환
- 5xx 오류율 > 5% (Cloudflare Analytics)
- 신규 배포 후 핵심 기능(로그인, 인스펙션 저장, R2 업로드) 1개 이상 실패
- DB 마이그레이션이 데이터 손상 가능성을 보임
- 보안 사고 의심 (예상치 못한 외부 접근)

> 망설이지 않는다. 롤백은 실패가 아니라 정상 운영의 일부.

---

## 1. 빠른 롤백 (이미지 태그 되돌리기)

가장 흔한 시나리오: 새 컨테이너 이미지가 망가짐. 이전 이미지 태그로 즉시 복귀.

### 1-1. 이전에 동작하던 git SHA 확인

```bash
# GHCR 이미지 태그 목록 (최근 10개)
gh api -H "Accept: application/vnd.github+json" \
  /users/saintgo7/packages/container/saas-aed/versions \
  | jq '.[].metadata.container.tags' | head -30

# 또는 abada-65 호스트 측 docker history
docker images ghcr.io/saintgo7/saas-aed --format '{{.Tag}}\t{{.CreatedSince}}' | head
```

### 1-2. APP_TAG 변경 후 재기동

```bash
cd /data/saas-aed

# 직전 stable SHA로 변경
PREV_SHA="abc1234..."   # 실제 값으로 치환
sed -i "s/^APP_TAG=.*/APP_TAG=${PREV_SHA}/" .env.production

# 또는 임시로 명령행에서 override
APP_TAG="${PREV_SHA}" docker compose pull app cron-worker
APP_TAG="${PREV_SHA}" docker compose up -d app cron-worker

# 헬스 확인
sleep 10
curl -fsS https://aed.abada.co.kr/api/health
```

### 1-3. 검증

```bash
docker compose ps
docker compose logs --tail=50 app
curl -fsS -o /dev/null -w 'HTTP %{http_code}\n' https://aed.abada.co.kr/
```

기대: 모든 서비스 healthy, HTTP 200.

---

## 2. 전체 스택 재기동

이미지가 아닌 인프라(Redis/PostgreSQL/cloudflared) 이슈 의심 시.

```bash
cd /data/saas-aed

# graceful stop
docker compose down

# 이전 상태로 시작 (볼륨 데이터는 보존됨)
docker compose up -d

# 순서대로 헬스 회복 확인
docker compose ps
```

> **주의**: `docker compose down -v`는 절대 금지. `-v`는 볼륨까지 삭제 → DB/Redis 데이터 소실.

---

## 3. DB 마이그레이션 실패 — 백업 복원

마이그레이션이 데이터를 깨뜨렸거나 새 스키마가 호환되지 않을 때.

### 3-1. 영향 범위 동결

```bash
# 쓰기 트래픽 차단 — app 컨테이너만 정지 (DB는 유지)
docker compose stop app cron-worker

# 또는 nginx 단에서 503 페이지 노출 (선호)
docker compose stop app
```

### 3-2. 최신 백업 파일 식별

```bash
ls -lt /data/saas-aed/backup/ | head -5
# aed-20260501-020001.sql.gz.gpg  (예시)

LATEST=$(ls -t /data/saas-aed/backup/aed-*.sql.gz.gpg | head -1)
echo "복원 대상: $LATEST"
```

R2에서 가져와야 할 경우:

```bash
aws s3 ls "s3://${BACKUP_R2_BUCKET}/" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  | sort | tail -5

aws s3 cp "s3://${BACKUP_R2_BUCKET}/aed-20260501-020001.sql.gz.gpg" \
  /data/saas-aed/backup/ \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
```

### 3-3. 복호화

```bash
cd /data/saas-aed/backup
gpg --decrypt --output aed-restore.sql.gz "$LATEST"
gunzip aed-restore.sql.gz
# → aed-restore.sql 생성
```

### 3-4. PostgreSQL 복원

```bash
# 안전: 새 DB로 먼저 복원해 검증
docker exec -i aed-postgres psql -U aed -d postgres \
  -c "CREATE DATABASE aed_restore;"

docker exec -i aed-postgres psql -U aed -d aed_restore \
  < /data/saas-aed/backup/aed-restore.sql

# 검증: row count, 테이블 개수
docker exec aed-postgres psql -U aed -d aed_restore \
  -c "SELECT count(*) FROM users;"

# OK 이면 운영 DB 교체
docker exec aed-postgres psql -U aed -d postgres -c "
  ALTER DATABASE aed RENAME TO aed_broken_$(date +%Y%m%d);
  ALTER DATABASE aed_restore RENAME TO aed;
"
```

### 3-5. 앱 재기동

```bash
docker compose up -d app cron-worker
docker compose logs -f app   # 마이그레이션 재실행 로그 확인 (필요 시)
curl -fsS https://aed.abada.co.kr/api/health
```

### 3-6. 데이터 차이 확인

복원 시점부터 장애 시점 사이의 데이터는 유실. 가능한 보강 절차:

- Cloudflare Analytics 로그에서 영향 받은 사용자 식별
- R2의 업로드 객체 타임스탬프와 DB 레코드 비교 — 고아 객체 정리 또는 수동 매핑

---

## 4. cloudflared 롤백 (외부 접근 불가)

터널이 죽어 사이트에 접근 안 될 때.

```bash
# 현재 터널 상태
docker compose ps cloudflared
docker compose logs --tail=100 cloudflared

# 빠른 재기동
docker compose restart cloudflared

# 그래도 안 되면 토큰/UUID 점검
grep -E 'CLOUDFLARED_TOKEN|tunnel:' /data/saas-aed/.env.production /data/saas-aed/cloudflared/config.yml

# 최후: 새 터널 생성 + DNS 재라우팅
cloudflared tunnel create aed-tunnel-emergency
cloudflared tunnel route dns aed-tunnel-emergency aed.abada.co.kr
# → /data/saas-aed/cloudflared/<NEW-UUID>.json + config.yml 갱신 후 재기동
```

---

## 5. 사용자 통신 템플릿

### 5-1. 장애 인지 (시작 5분 이내)

```
[saas-aed 서비스 안내]
현재 서비스 접속 장애가 확인되었습니다 (HH:MM부터).
원인 파악 및 복구 작업 중이며, 복구 시 즉시 안내드리겠습니다.
- 영향 범위: 전체 사용자 / 로그인 / 인스펙션 저장
- 우회 방법: 현재 없음
- 다음 안내: 30분 후
- 문의: ops@abada.co.kr
```

### 5-2. 복구 완료

```
[saas-aed 복구 완료]
HH:MM부터 발생한 접속 장애가 HH:MM에 정상화되었습니다.
- 장애 시간: 약 X분
- 원인: <간략 — 예: 신규 배포 호환성 문제>
- 조치: 직전 안정 버전으로 롤백
- 데이터 영향: 없음 (또는 HH:MM~HH:MM 사이 등록건 일부 재시도 필요)
- 사후 분석 보고서: 영업일 2일 내 공유
```

### 5-3. 데이터 손실 발생 케이스 (드물지만 정직하게)

```
[saas-aed 장애 보고 — 데이터 영향 안내]
HH:MM~HH:MM 사이 발생한 장애 복구 과정에서, 해당 시간대에 등록된
일부 데이터가 복원 백업 시점 이전 상태로 되돌아갔습니다.
- 영향 데이터: <건수 / 종류>
- 식별 방법: 마이페이지 → 활동 내역에서 확인 가능
- 보상/조치: <실제 조치>
- 책임자: <이름> / ops@abada.co.kr
진심으로 사과드립니다.
```

---

## 6. 사후 작업 (Post-Incident)

복구 후 24시간 이내 수행.

- [ ] 타임라인 작성 (장애 인지 → 1차 조치 → 복구 → 안내)
- [ ] 근본 원인(RCA) 문서화 — 5 Whys
- [ ] 재발 방지 액션 아이템 + 담당자 + 마감일
- [ ] 관련 알림/모니터링 룰 보완
- [ ] 백업/복원 스크립트 반영 사항 PR
- [ ] 본 `rollback.md`에 실전 학습 추가

---

## 부록: 롤백 의사결정 트리 (요약)

```
장애 발생
  ├─ 외부 헬스체크 실패?
  │   └─ Cloudflare Tunnel 문제? → §4
  │   └─ 그 외? → §1 (이미지 태그 롤백)
  ├─ DB 데이터 이상?
  │   └─ §3 (백업 복원)
  └─ 인프라 컨테이너 이상?
      └─ §2 (전체 재기동)
```
