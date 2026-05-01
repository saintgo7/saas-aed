# Book — AED Inspection SaaS / AED 점검 SaaS 단행본

> 한/영 동시 출판 단행본 빌드 워크스페이스 / Bilingual book build workspace

## KO — 빠른 시작

```bash
# 1) 의존성 설치 (macOS 기준)
brew install pandoc
brew install --cask mactex-no-gui   # xelatex 포함

# 2) 폰트 설치
#    한글: Pretendard Variable      https://github.com/orioncactus/pretendard
#    영문: Inter                     https://rsms.me/inter/
#    코드: JetBrains Mono            https://www.jetbrains.com/lp/mono/

# 3) 책 빌드
./docs/book/generate.sh                  # 한/영 × DOCX/PDF 4종 빌드
./docs/book/generate.sh ko               # 한국어판만 (DOCX + PDF)
./docs/book/generate.sh en pdf           # 영문판 PDF만

# 4) 결과물
ls docs/book/dist/
#   aed-saas-book-ko-20260501.docx
#   aed-saas-book-ko-20260501.pdf
#   aed-saas-book-en-20260501.docx
#   aed-saas-book-en-20260501.pdf
```

## KO — 디렉토리 구조

```
docs/book/
├── README.md                  ← 이 문서
├── SCREENSHOT_WORKFLOW.md     ← 캡처 도구·해상도·마커 형식·시크릿 가림 규약
├── generate.sh                ← 빌드 스크립트 (chmod +x 적용)
├── ko/                        ← 한국어판
│   ├── 00-cover.md
│   ├── 01-problem.md
│   ├── ...
│   ├── 17-scaling.md
│   └── appendix/
│       ├── A-form-12items.md
│       ├── B-env-vars.md
│       ├── C-ops-checklist.md
│       └── D-troubleshooting.md
├── en/                        ← 영문판 (동일 구조)
│   └── ...
├── templates/
│   ├── pandoc-ko.yaml         ← xelatex + Pretendard
│   └── pandoc-en.yaml         ← xelatex + Inter
└── assets/
    └── screenshots/           ← 한/영 공유 PNG (slug 일치)
```

## KO — 캡처 마커 + 검증

각 챕터의 본문 섹션 사이에 다음 마커를 박아 둔다.

```markdown
<!-- SCREENSHOT: ch07-step02-auth-config -->
![Auth.js 다기관 설정](../assets/screenshots/ch07-step02-auth-config.png)
*그림 7-2. 캡션 텍스트.*
<!-- /SCREENSHOT -->
```

캡처 누락 검증:

```bash
./scripts/verify-screenshots.sh           # 누락 목록 출력
./scripts/verify-screenshots.sh --strict  # 누락 시 exit 1 (CI 권장)

VERIFY_SCREENSHOTS=1 ./docs/book/generate.sh   # 빌드 직전 자동 검증
```

캡처 헬퍼 (macOS):

```bash
./scripts/capture-helper.sh ch07-step02-auth-config "Auth.js 다기관 설정"
```

자세한 규약은 [`SCREENSHOT_WORKFLOW.md`](./SCREENSHOT_WORKFLOW.md) 참조.

## KO — 라이선스

- 본문(텍스트, 다이어그램, 스크린샷): **CC BY-NC-SA 4.0**
- 코드/설정 스니펫: **MIT**

---

## EN — Quick Start

```bash
# 1) Install dependencies (macOS)
brew install pandoc
brew install --cask mactex-no-gui   # ships xelatex

# 2) Install fonts
#    Korean: Pretendard Variable    https://github.com/orioncactus/pretendard
#    English: Inter                  https://rsms.me/inter/
#    Code:   JetBrains Mono          https://www.jetbrains.com/lp/mono/

# 3) Build the book
./docs/book/generate.sh                  # build all four (ko/en × docx/pdf)
./docs/book/generate.sh ko               # KO only (DOCX + PDF)
./docs/book/generate.sh en pdf           # EN PDF only

# 4) Artifacts
ls docs/book/dist/
```

## EN — Directory Layout

```
docs/book/
├── README.md                  ← this file
├── SCREENSHOT_WORKFLOW.md     ← capture tools, resolution, markers, secret hygiene
├── generate.sh                ← build script (chmod +x already applied)
├── ko/                        ← Korean edition
├── en/                        ← English edition (same structure)
├── templates/
│   ├── pandoc-ko.yaml         ← xelatex + Pretendard
│   └── pandoc-en.yaml         ← xelatex + Inter
└── assets/
    └── screenshots/           ← shared PNGs (one slug, two captions)
```

## EN — Screenshot Markers and Verification

Embed markers between body sections of every chapter:

```markdown
<!-- SCREENSHOT: ch07-step02-auth-config -->
![Auth.js multi-tenant setup](../assets/screenshots/ch07-step02-auth-config.png)
*Figure 7-2. Caption text.*
<!-- /SCREENSHOT -->
```

Verifying coverage:

```bash
./scripts/verify-screenshots.sh           # list missing
./scripts/verify-screenshots.sh --strict  # exit 1 on missing (recommended in CI)

VERIFY_SCREENSHOTS=1 ./docs/book/generate.sh   # auto-verify before build
```

Capture helper (macOS):

```bash
./scripts/capture-helper.sh ch07-step02-auth-config "Auth.js multi-tenant setup"
```

See [`SCREENSHOT_WORKFLOW.md`](./SCREENSHOT_WORKFLOW.md) for the full
convention (resolution, post-processing, naming, secret hygiene).

## EN — License

- Prose, diagrams, screenshots: **CC BY-NC-SA 4.0**
- Code and configuration samples: **MIT**
