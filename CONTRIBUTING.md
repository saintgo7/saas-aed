# 기여 가이드 / Contributing Guide

> 한국어가 우선이며, 영어 번역이 병기됩니다.
> Korean is primary; English follows.

---

## 개발 환경 셋업 / Development Setup

```bash
# 1. 의존성 설치 / Install dependencies
pnpm install

# 2. 환경 변수 설정 / Configure environment
cp .env.example .env.local
# .env.local 을 편집하여 DATABASE_URL, AUTH_SECRET 등을 설정합니다.
# Edit .env.local to set DATABASE_URL, AUTH_SECRET, etc.

# 3. 인프라 기동 (Postgres + Redis) / Start infrastructure
docker compose up -d

# 4. DB 마이그레이션 / Run database migrations
pnpm db:migrate

# 5. 개발용 시드 / Seed development data
pnpm db:seed:dev

# 6. 개발 서버 실행 / Start dev server
pnpm dev
```

---

## 브랜치 전략 / Branch Strategy

| Prefix | 용도 / Purpose |
|--------|----------------|
| `feat/` | 새로운 기능 / New feature |
| `fix/` | 버그 수정 / Bug fix |
| `chore/` | 빌드, 의존성, 설정 / Build, deps, config |
| `docs/` | 문서 변경 / Documentation only |

예시 / Example: `feat/inspection-signature-canvas`, `fix/r2-upload-timeout`.

---

## 커밋 컨벤션 / Commit Convention

[Conventional Commits](https://www.conventionalcommits.org/) 를 따릅니다.
Follows [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <subject>

<body>

<footer>
```

타입 / Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

예시 / Example:

```
feat(inspection): add signature canvas with stroke smoothing

- signature_pad 라이브러리 통합
- 모바일 터치 이벤트 보정
- DOCX/PDF 양쪽에 base64 임베드

Closes #42
```

---

## PR 체크리스트 / Pull Request Checklist

PR 을 열기 전에 모두 확인해 주세요. Please verify before opening a PR.

- [ ] `pnpm typecheck` 통과 / passes
- [ ] `pnpm lint` 통과 / passes
- [ ] `pnpm test` 통과 / passes
- [ ] 새 기능에는 테스트가 포함됨 / New features include tests
- [ ] 캡처 마커(Screenshot Markers) 검증 통과 (UI 변경 시)
      / Screenshot markers verified (when UI changes)
- [ ] CHANGELOG.md 업데이트 / Updated
- [ ] 보안에 민감한 변경은 SECURITY.md 검토 / Security-sensitive changes reviewed against SECURITY.md

---

## 캡처 워크플로우 / Screenshot Workflow

UI 캡처가 필요한 변경은 [`docs/SCREENSHOT_WORKFLOW.md`](docs/SCREENSHOT_WORKFLOW.md) 를 참고하세요.
For UI changes that require screenshots, see [`docs/SCREENSHOT_WORKFLOW.md`](docs/SCREENSHOT_WORKFLOW.md).

핵심 / Key points:

1. 캡처 마커(`<!-- screenshot:start:NAME -->`)를 코드에 삽입합니다.
2. `pnpm book:verify-screenshots` 로 마커가 누락되지 않았는지 검증합니다.
3. 책(book) 빌드는 마커 검증을 통과해야 진행됩니다.

---

## 행동 규범 / Code of Conduct

존중과 협력을 우선합니다. 차별·괴롭힘은 허용되지 않습니다.
Be respectful and collaborative. Discrimination and harassment are not tolerated.
