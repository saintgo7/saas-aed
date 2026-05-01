# Screenshot Workflow / 캡처 워크플로우

> 한/영 병기. KO 섹션 먼저, EN 섹션이 이어집니다.
> KO first, EN follows.

---

## KO — 캡처 워크플로우

### 1. 왜 캡처인가

이 책은 "코드를 읽으며 따라 만든다" 형식이다. 책의 본문에 인쇄된 코드 블록은
정보의 절반이고, 나머지 절반은 **코드를 작성하는 그 순간의 화면**이다. VS Code의
파일 트리, 터미널의 명령어 출력, 브라우저의 실제 동작 — 이 세 가지를 일관된
포맷으로 캡처해 책 안에 박아 넣는다.

### 2. 권장 도구

| 도구 | 플랫폼 | 비고 |
|---|---|---|
| `Cmd+Shift+5` (기본 도구) | macOS | 영역/창/전체 선택, 5초 타이머 |
| **Shottr** | macOS | 픽셀 자/주석/스크롤 캡처 (무료 티어 충분) |
| **CleanShot X** | macOS | 강조/모자이크/GIF (유료, 권장) |
| **ShareX** | Windows | 오픈소스 |
| `gnome-screenshot` / `flameshot` | Linux | 표준 도구 |

본 프로젝트는 macOS의 `screencapture` 명령을 래핑한
`scripts/capture-helper.sh` 를 함께 제공한다.

### 3. 해상도 / 포맷 규약

- **포맷**: PNG (lossless). JPG 금지
- **해상도**: 가로 1600px 기준 (Retina 2x 캡처 시 3200px → 1600px 다운스케일)
- **DPI**: 144 DPI (인쇄 시 PDF 임베드 품질 확보)
- **파일 크기**: 한 장당 500KB 이하 권장 (`pngquant --quality 80-95`)
- **색상**: sRGB

### 4. 캡처 후 처리

| 처리 | 도구 | 목적 |
|---|---|---|
| 강조 박스 (빨간 테두리) | Shottr/CleanShot | 핵심 코드 라인/버튼 지정 |
| 화살표 | Shottr/CleanShot | 시선 흐름 안내 |
| 모자이크 | Shottr/CleanShot | API 키, 실제 메일, 토큰 가리기 |
| 여백 자르기 | `convert` (ImageMagick) | 불필요한 윈도우 크롬 제거 |
| 압축 | `pngquant` | 파일 크기 절감 |

**시크릿 가림은 필수다.** `.env` 값, JWT, 실제 이메일, 전화번호, 사번이 보이는
캡처는 곧 사고다. 한 번 게시된 PDF는 회수 불가능하다.

### 5. 파일 네이밍 규칙

```
ch{NN}-step{NN}-{slug}.png
app-{a-d}-step{NN}-{slug}.png
```

- `ch01` ~ `ch17`: 본문 챕터
- `app-a` ~ `app-d`: 부록 A~D
- `step01` ~ `stepNN`: 그 장에서의 순서 (집필자 임의 부여, 빈도 권장 3~8개)
- `{slug}`: 영문 소문자 + 하이픈, 핵심 동사+명사 (예: `auth-config`, `signature-canvas`, `docker-compose-up`)

**예시**

```
ch04-step01-docker-compose-up.png
ch07-step02-auth-config.png
ch09-step03-signature-canvas.png
app-d-step12-cron-deadlock-fix.png
```

### 6. 저장 위치

```
docs/book/assets/screenshots/
```

모든 캡처는 단일 디렉토리에 평면 저장한다. 챕터별 폴더로 나누지 않는 이유는
파일명에 이미 `ch07-` 프리픽스가 있어 정렬·검색이 용이하기 때문.

### 7. 마커 표준 형식

각 챕터의 본문 섹션 사이에 다음 마커를 박아 넣는다.

```markdown
<!-- SCREENSHOT: ch07-step02-auth-config -->
![Auth.js 다기관 설정 — Session callback에 tenantId 주입](../assets/screenshots/ch07-step02-auth-config.png)
*그림 7-2. Auth.js callbacks 작성 시점의 VS Code 화면. 좌측 파일트리에서 src/lib/auth/auth.ts 선택, 우측 16번째 줄 session.user.tenantId 추가 부분 강조.*
<!-- /SCREENSHOT -->
```

규칙

- 여는 마커 `<!-- SCREENSHOT: {slug} -->` 와 닫는 마커 `<!-- /SCREENSHOT -->` 한 쌍
- 슬러그는 마커 안과 파일 경로 안에서 동일해야 함
- 캡션은 `*기울임*` 으로, "그림 X-Y." 번호를 앞에 붙임
- 한국어판/영문판은 같은 `slug` 와 같은 PNG 를 공유한다 (캡션만 각 언어로)

### 8. 캡처 위치 원칙 (장당 3~8개)

1. **새 파일을 만든 직후** — 빈 파일에 첫 import 만 있는 상태
2. **핵심 결정 코드를 쓰는 순간** — tenant guard, signature 검증 같은 도메인 핵심
3. **명령어 실행 결과** — 터미널 출력 (성공/실패 모두)
4. **빌드/테스트 통과 화면** — `pnpm test`, `docker compose ps`
5. **실제 동작 UI** — 브라우저에서 점검 폼/서명/PDF 미리보기

### 9. generate.sh 처리 방식

`generate.sh` 는 마커를 그대로 pandoc 에 넘긴다. pandoc 은 `<!-- ... -->` 를
HTML 주석으로 인식해 출력에서 제거하고, `![...](...)` 이미지 태그만 유지한다.
즉, 마커는 **개발 시 식별·검증용**이고 최종 책에는 이미지와 캡션만 남는다.

### 10. 누락 검증

```bash
./scripts/verify-screenshots.sh           # 누락 목록 출력
./scripts/verify-screenshots.sh --strict  # 누락 시 exit 1 (CI 용)
```

CI 의 책 빌드 단계 직전에 `--strict` 모드로 실행하면, 마커는 박아 두었으나
실제 PNG 가 없는 경우를 빌드 실패로 만든다.

### 11. 캡처 헬퍼

```bash
./scripts/capture-helper.sh ch07-step02-auth-config "Auth.js 다기관 설정"
```

영역 선택 → 자동 저장 → 마크다운 스니펫 출력. 결과 스니펫을 그대로 챕터에
붙여 넣으면 된다.

---

## EN — Screenshot Workflow

### 1. Why screenshots

This book is designed to be read while building. The printed code blocks carry
half the information; the other half lives in **the screen at the moment the
code is being written** — the VS Code file tree, the terminal output, the
browser actually rendering the form. We capture all three in a uniform format.

### 2. Recommended tools

| Tool | Platform | Notes |
|---|---|---|
| `Cmd+Shift+5` (built-in) | macOS | Region/window/full, 5s timer |
| **Shottr** | macOS | Pixel ruler, annotations, scrolling capture (free tier is enough) |
| **CleanShot X** | macOS | Highlight, blur, GIF (paid, recommended) |
| **ShareX** | Windows | Open source |
| `gnome-screenshot` / `flameshot` | Linux | Standard tools |

This project ships a macOS wrapper at `scripts/capture-helper.sh`.

### 3. Resolution and format

- **Format**: PNG (lossless). No JPG.
- **Width**: 1600px (capture at Retina 2x → 3200px, then downscale)
- **DPI**: 144 (so the PDF embed stays crisp)
- **File size**: under ~500KB per image (`pngquant --quality 80-95`)
- **Color**: sRGB

### 4. Post-processing

- Red highlight box around the key line or button
- Arrows for visual flow
- Mosaic on secrets (API keys, real emails, JWTs)
- Crop excess window chrome
- Compress with `pngquant`

**Hiding secrets is not optional.** A leaked `.env`, JWT, real email or
phone number in a screenshot becomes a permanent incident the moment the PDF
ships.

### 5. File naming

```
ch{NN}-step{NN}-{slug}.png
app-{a-d}-step{NN}-{slug}.png
```

Examples:

```
ch04-step01-docker-compose-up.png
ch07-step02-auth-config.png
ch09-step03-signature-canvas.png
app-d-step12-cron-deadlock-fix.png
```

### 6. Storage location

```
docs/book/assets/screenshots/
```

Flat directory. No per-chapter sub-folders — the `ch07-` prefix already sorts.

### 7. Marker standard

```markdown
<!-- SCREENSHOT: ch07-step02-auth-config -->
![Auth.js multi-tenant setup — injecting tenantId in the session callback](../assets/screenshots/ch07-step02-auth-config.png)
*Figure 7-2. VS Code at the moment we wrote the Auth.js callbacks. Left: file tree with src/lib/auth/auth.ts selected. Right: line 16 highlighted where session.user.tenantId is added.*
<!-- /SCREENSHOT -->
```

Rules: opening + closing marker, identical slug inside the marker and the file
path, italic caption with a "Figure X-Y." prefix, KO/EN share the same PNG and
slug (only the caption differs).

### 8. Where to place captures (3–8 per chapter)

1. Right after creating a new file
2. The moment the key decision code is written (tenant guard, signature verification)
3. Terminal output (both success and failure)
4. Build / test passing (`pnpm test`, `docker compose ps`)
5. The actual running UI in the browser

### 9. How `generate.sh` handles markers

`generate.sh` passes markers untouched to pandoc. Pandoc treats `<!-- ... -->`
as HTML comments and drops them, keeping only the `![...](...)` image tag. The
markers exist for development and verification, not for the final book.

### 10. Verifying coverage

```bash
./scripts/verify-screenshots.sh           # list missing
./scripts/verify-screenshots.sh --strict  # exit 1 on missing (CI)
```

Run with `--strict` right before the book build step so missing PNGs fail CI.

### 11. Capture helper

```bash
./scripts/capture-helper.sh ch07-step02-auth-config "Auth.js multi-tenant setup"
```

Region select → auto-save → prints a Markdown snippet you can paste straight
into the chapter.
