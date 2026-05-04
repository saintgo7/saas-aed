---
title: "부록 F. 운영 마이그레이션 가이드 — 함정과 해결책"
slug: "appendix-prod-migrations"
appendix: "F"
words_target: 2500
---

# 부록 F. 운영 마이그레이션 가이드

> **결론 먼저** — 운영 컨테이너(`runner` stage)에는 `drizzle-kit`이 없다.
> `docker-compose run --rm app pnpm db:migrate`는 작동하지 않는다.
> 두 가지 우회로가 있고, **(1) `migrator` 프로파일** 또는 **(2) SQL 직접 적용**이다.

## 함정 1 — runner 이미지에 dev 의존성 없음

`Dockerfile`의 runner 단계는 Next.js standalone 빌드만 복사한다.
`drizzle-kit`은 `devDependencies`라 이미지에 들어가지 않는다.

```dockerfile
# runtime
FROM node:22-alpine AS runner
COPY --from=builder /app/.next/standalone ./
# drizzle-kit 없음, tsx 없음, pnpm 명령은 corepack만
```

**해결**: 별도의 `migrator` 단계를 추가했다. `builder`처럼 모든 deps를 갖춘 채 `pnpm db:migrate`/`pnpm seed:cnu`를 실행하기 위한 일회성 이미지.

```bash
# 빌드 + 실행
docker-compose --profile tools build migrator
docker-compose --profile tools run --rm migrator                  # pnpm db:migrate
docker-compose --profile tools run --rm migrator pnpm seed:cnu
```

`profiles: [tools]`로 묶어서 `docker-compose up -d`엔 안 따라온다.

## 함정 2 — `pgEnum` DROP/CREATE이 default 의존성으로 실패

drizzle-kit은 enum 값이 바뀌면 자동으로 다음 SQL을 생성한다.

```sql
ALTER TABLE "public"."users" ALTER COLUMN "role" SET DATA TYPE text;
DROP TYPE "public"."user_role";
CREATE TYPE "public"."user_role" AS ENUM('SUPER_ADMIN', 'HQ_ADMIN', ...);
ALTER TABLE "public"."users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";
```

`DROP TYPE`이 `users.role`의 default 값에 걸려 실패한다:

```
ERROR: cannot drop type user_role because other objects depend on it
DETAIL: default value for column role of table users depends on type user_role
```

이 시점에서 컬럼 타입은 `text`로 바뀌었고, 그 후 `CREATE TYPE`은 이미 존재하는 타입과 충돌해 또 실패. 마지막 `ALTER ... USING`만 성공해서 컬럼은 **옛 enum**으로 복원됨.

**해결 — 손으로 보정**:

```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'  BEFORE 'SYSTEM_ADMIN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'HQ_ADMIN'     AFTER  'SUPER_ADMIN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'DEPT_MANAGER' AFTER  'HQ_ADMIN';
```

`ADD VALUE`는 default 의존성을 건드리지 않고, `IF NOT EXISTS`로 idempotent.
PostgreSQL 12+에선 트랜잭션 안에서도 가능.

**예방 — drizzle-kit 사용 시**:
- enum 변경 PR엔 자동 생성된 SQL 대신 손으로 작성한 `ADD VALUE`만 남기기
- 또는 새 enum 이름으로 만든 뒤 column type을 갈아끼우는 2-step 마이그레이션

## 함정 3 — 운영 compose가 `build:`만 가리켜서 ghcr 이미지 안 받음

CI는 `ghcr.io/<repo>:latest`를 빌드/푸시하지만, 운영 `docker-compose.yml`이 `build: ./src`만 갖고 있으면 `docker-compose pull`은 의미 없음.

**해결** — `image:` + `build:` 둘 다 두기:

```yaml
services:
  app:
    image: ghcr.io/saintgo7/saas-aed:${APP_TAG:-latest}
    build: ./src
    container_name: aed-app
```

이러면:
- `docker-compose pull` → ghcr에서 받기
- `docker-compose build` → 로컬 빌드 (네트워크 끊겼을 때 폴백)
- `up -d` → 우선 image, 없으면 build

**전제 조건**: ghcr 패키지가 public이거나, 호스트에 `docker login ghcr.io` 한 번 해두기 (PAT with `read:packages`).

## 함정 4 — runner에 `wget` 없음 → healthcheck 실패

이미 해결된 함정이지만 기록:

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
```

alpine 이미지엔 `wget`/`curl`이 없으므로 node의 `fetch`로 대체. node 22+에서 글로벌 fetch 사용 가능.

## 운영 마이그레이션 표준 절차 (체크리스트)

```bash
ssh abada-65
cd /data/abada-kr/aed-abada-kr/aed.abada.kr/src

# 1) 코드 동기화
git pull --ff-only origin main

# 2) 마이그레이션 SQL 검토 — enum DROP이 있는지?
ls -la drizzle/*.sql | tail -3
grep -E "DROP TYPE|ALTER TABLE.*ALTER COLUMN.*role" drizzle/<latest>.sql

# 3-a) enum 변경 없으면 — migrator 컨테이너로 자동
cd /data/abada-kr/aed-abada-kr/aed.abada.kr
docker-compose --profile tools build migrator
docker-compose --profile tools run --rm migrator

# 3-b) enum 변경 있으면 — SQL 직접 + 보정
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < src/drizzle/<latest>.sql || true
# 실패한 enum 부분만 ADD VALUE로 보정 (위 함정 2 참조)

# 4) 새 이미지로 재기동
docker-compose pull app                    # ghcr 우선
docker-compose up -d --no-deps app

# 5) 헬스체크
curl -fsS https://aed.abada.kr/api/health
```

## 같이 보면 좋은 부록

- **부록 C**: 운영 체크리스트 — 일상 운영 작업
- **부록 D**: 트러블슈팅 32가지 — 증상별 진단
- **부록 E**: 배포 디버깅 실전기 — 7가지 함정과 패치

이 부록 F는 그 중 **DB 마이그레이션 한정** 함정을 모은 것.
