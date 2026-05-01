# DESIGN.md — AED 점검 SaaS 디자인 시스템

> **Version**: 1.0.0
> **Last Updated**: 2026-05-01
> **Owner**: Senior Product Designer
> **Status**: Source of Truth

---

## 0. 문서의 목적

본 문서는 AED(자동심장충격기) 점검 관리 SaaS의 **단일 디자인 진실 공급원(Single Source of Truth)** 이다.

- 모든 디자이너/엔지니어는 본 문서를 따른다.
- Tailwind config·shadcn/ui 컴포넌트·Figma 라이브러리는 본 문서에서 파생된다.
- 변경은 PR + 디자인 리뷰 후 본 문서에 먼저 반영된다.

---

## 1. 디자인 철학

### 1.1 한 줄 정의

> **"50대 점검자가 비 오는 주차장에서 장갑 낀 손가락 하나로 3분 안에 점검을 끝낸다."**

### 1.2 다섯 기둥(5 Pillars)

1. **현장 손가락 친화적 (Field-Finger-Friendly)**
   - 모든 인터랙티브 요소는 최소 44×44px 터치 영역.
   - 한 손 엄지 도달 영역(thumb zone) 안에 핵심 액션 배치.
   - 비/땀/장갑 환경 → 시각적 피드백(active scale-95, ripple) 강화.

2. **1탭 입력 (One-Tap-Input)**
   - "이번 달 점검 시작" 버튼은 홈 화면에서 1탭으로 도달.
   - 점검 12항목은 라디오(예/아니오/해당없음) 기본 — 키보드 입력 최소화.
   - 자주 쓰는 값은 직전 점검값 자동 기재(prefill) + "그대로" 버튼.

3. **응급 시 즉시 식별 (Emergency-Glanceable)**
   - 미점검·고장 상태는 빨강(#DC2626) + 아이콘 + 굵은 텍스트 3중 표기.
   - 색약(color-blind) 사용자도 아이콘만으로 상태 판별 가능.
   - 5m 거리에서 화면 보고 "정상/이상" 식별 가능한 폰트 크기.

4. **감사 대비 명확한 기록 (Audit-Ready)**
   - 모든 액션에 타임스탬프(±1초) + 사용자 + 위치 자동 기록.
   - 서명 캔버스 → PNG + 메타데이터(IP, UA, 시각) 분리 저장.
   - 변경 이력은 "수정"이 아니라 "취소+신규" 패턴으로 기록.

5. **신뢰감의 톤 (Trustworthy Tone)**
   - 의료/안전 분야 → 채도 낮은 슬레이트 블루 기반.
   - 마이크로카피는 격식체("점검을 시작합니다" / "기록되었습니다").
   - 응급/위험 색은 **희소하게**(미점검·고장에만) 사용.

### 1.3 차용한 패턴

| 출처 | 패턴 | 적용 |
|------|------|------|
| iOS Human Interface Guidelines | Bottom sheet, Swipe action, Large title | 모바일 모달, 점검 항목 빠른 액션, 대시보드 헤더 |
| Material Design 3 | Bottom navigation, FAB, Ripple, Elevation | 하단 탭, "이번 달 점검 시작" FAB, 터치 피드백 |
| Apple Health | 색상 카드 + 아이콘 + 큰 숫자 | 대시보드 KPI 카드 |
| Linear | 차분한 슬레이트 톤 + 서브픽셀 hairline | PC 관리자 화면 |

---

## 2. 컬러 시스템

### 2.1 컬러 토큰 원칙

- 모든 색은 **의미(semantic)** 단위로 호출 (`bg-primary`, `text-danger` 등).
- 직접 hex 사용 금지. 토큰을 통해서만 접근.
- Dark mode 토큰을 동시에 정의 — 한 곳만 수정하면 양쪽 반영.

### 2.2 Primary — Slate Blue (의료 신뢰감)

베이스: `#1E40AF` (Tailwind blue-800 inspired, 채도 낮춘 슬레이트 블루)

| Token | Hex | RGB | Tailwind Class | 용도 |
|-------|-----|-----|----------------|------|
| primary-50 | `#EFF4FB` | 239, 244, 251 | `bg-primary-50` | 배경, 호버 라이트 |
| primary-100 | `#DBE5F4` | 219, 229, 244 | `bg-primary-100` | 비활성 채움 |
| primary-200 | `#B7CAE9` | 183, 202, 233 | `bg-primary-200` | 보더 강조 |
| primary-300 | `#8AA6D7` | 138, 166, 215 | `bg-primary-300` | 비활성 텍스트 |
| primary-400 | `#5C82C4` | 92, 130, 196 | `bg-primary-400` | 보조 액션 |
| primary-500 | `#3A60B0` | 58, 96, 176 | `bg-primary-500` | **기본 Primary** |
| primary-600 | `#2C4F9A` | 44, 79, 154 | `bg-primary-600` | 호버 |
| primary-700 | `#1E40AF` | 30, 64, 175 | `bg-primary-700` | 액티브, 강조 |
| primary-800 | `#1A3585` | 26, 53, 133 | `bg-primary-800` | 다크 헤더 |
| primary-900 | `#152A66` | 21, 42, 102 | `bg-primary-900` | 다크 배경 |

### 2.3 Success — Emerald (AED 정상)

| Token | Hex | RGB | Tailwind Class | 용도 |
|-------|-----|-----|----------------|------|
| success-50 | `#ECFDF5` | 236, 253, 245 | `bg-success-50` | 정상 카드 배경 |
| success-100 | `#D1FAE5` | 209, 250, 229 | `bg-success-100` | 배지 라이트 |
| success-500 | `#059669` | 5, 150, 105 | `bg-success-500` | **기본 Success** |
| success-600 | `#047857` | 4, 120, 87 | `bg-success-600` | 호버 |
| success-700 | `#065F46` | 6, 95, 70 | `bg-success-700` | 액티브 |

### 2.4 Warning — Amber (교체 임박, D-30)

| Token | Hex | RGB | Tailwind Class | 용도 |
|-------|-----|-----|----------------|------|
| warning-50 | `#FFFBEB` | 255, 251, 235 | `bg-warning-50` | 경고 카드 배경 |
| warning-100 | `#FEF3C7` | 254, 243, 199 | `bg-warning-100` | 배지 라이트 |
| warning-500 | `#D97706` | 217, 119, 6 | `bg-warning-500` | **기본 Warning** |
| warning-600 | `#B45309` | 180, 83, 9 | `bg-warning-600` | 호버 |
| warning-700 | `#92400E` | 146, 64, 14 | `bg-warning-700` | 액티브 |

### 2.5 Danger — Red (미점검·고장)

| Token | Hex | RGB | Tailwind Class | 용도 |
|-------|-----|-----|----------------|------|
| danger-50 | `#FEF2F2` | 254, 242, 242 | `bg-danger-50` | 위험 카드 배경 |
| danger-100 | `#FEE2E2` | 254, 226, 226 | `bg-danger-100` | 배지 라이트 |
| danger-500 | `#DC2626` | 220, 38, 38 | `bg-danger-500` | **기본 Danger** |
| danger-600 | `#B91C1C` | 185, 28, 28 | `bg-danger-600` | 호버 |
| danger-700 | `#991B1B` | 153, 27, 27 | `bg-danger-700` | 액티브 |

> **위험 색 사용 규칙**: Danger 색은 "미점검", "고장", "삭제 확인 다이얼로그" 3가지에만 사용한다. UI 강조용으로 사용 금지.

### 2.6 Neutral — Slate Gray

| Token | Hex | RGB | Tailwind Class | 용도 |
|-------|-----|-----|----------------|------|
| neutral-0 | `#FFFFFF` | 255, 255, 255 | `bg-white` | 라이트 배경 |
| neutral-50 | `#F8FAFC` | 248, 250, 252 | `bg-neutral-50` | 페이지 배경 |
| neutral-100 | `#F1F5F9` | 241, 245, 249 | `bg-neutral-100` | 카드 보조 배경 |
| neutral-200 | `#E2E8F0` | 226, 232, 240 | `bg-neutral-200` | 보더 |
| neutral-300 | `#CBD5E1` | 203, 213, 225 | `bg-neutral-300` | 비활성 보더 |
| neutral-400 | `#94A3B8` | 148, 163, 184 | `text-neutral-400` | 플레이스홀더 |
| neutral-500 | `#64748B` | 100, 116, 139 | `text-neutral-500` | 보조 텍스트 |
| neutral-600 | `#475569` | 71, 85, 105 | `text-neutral-600` | 본문 보조 |
| neutral-700 | `#334155` | 51, 65, 85 | `text-neutral-700` | 본문 |
| neutral-800 | `#1E293B` | 30, 41, 59 | `text-neutral-800` | 제목 |
| neutral-900 | `#0F172A` | 15, 23, 42 | `text-neutral-900` | 강한 제목 |
| neutral-950 | `#020617` | 2, 6, 23 | `bg-neutral-950` | 다크 페이지 배경 |

### 2.7 Dark Mode 매핑

라이트 → 다크 토큰 자동 매핑(CSS variables 기반):

| Semantic | Light | Dark |
|----------|-------|------|
| `--bg-page` | `neutral-50` | `neutral-950` |
| `--bg-surface` | `neutral-0` | `neutral-900` |
| `--bg-surface-2` | `neutral-100` | `neutral-800` |
| `--text-primary` | `neutral-900` | `neutral-50` |
| `--text-secondary` | `neutral-600` | `neutral-400` |
| `--border-default` | `neutral-200` | `neutral-700` |
| `--brand` | `primary-700` | `primary-400` |
| `--success` | `success-600` | `success-400` |
| `--warning` | `warning-600` | `warning-400` |
| `--danger` | `danger-600` | `danger-400` |

### 2.8 색 대비 검증

| 조합 | 비율 | 등급 |
|------|------|------|
| `text-neutral-900` on `bg-neutral-50` | 16.1:1 | AAA |
| `text-neutral-700` on `bg-neutral-0` | 9.3:1 | AAA |
| `text-white` on `bg-primary-700` | 7.4:1 | AAA |
| `text-white` on `bg-danger-500` | 4.8:1 | AA |
| `text-white` on `bg-success-500` | 4.6:1 | AA |
| `text-white` on `bg-warning-500` | 3.5:1 | **AA Large only** — 본문엔 `warning-700` 사용 |

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

```css
--font-sans-ko: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--font-sans-en: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'D2Coding', 'Menlo', monospace;
```

| 용도 | 폰트 | 라이선스 | 비고 |
|------|------|----------|------|
| 한글 본문/UI | Pretendard | SIL OFL | 가독성 우수, web/woff2 무료 |
| 영문/숫자 | Inter | SIL OFL | UI 표준 |
| 점검 항목명·일련번호 | JetBrains Mono | Apache 2.0 | 영문/숫자 식별 강화 |

> **혼용 규칙**: `font-family`에 한글·영문을 함께 선언하면 브라우저가 글리프별로 자동 분리. Pretendard에 영문 글리프가 있어도 영문은 Inter가 우선되도록 별도 클래스(`font-en`)로 강제 가능.

### 3.2 Type Scale (5단계 + 보조 2단계)

| Token | px | rem | line-height | letter-spacing | 용도 |
|-------|-----|-----|-------------|----------------|------|
| `text-xs` | 12 | 0.75 | 16px (1.33) | 0 | 캡션, 메타 |
| `text-sm` | 14 | 0.875 | 20px (1.43) | 0 | 보조 텍스트, 버튼 sm |
| `text-base` | 16 | 1.0 | 24px (1.5) | 0 | **본문 기본** |
| `text-lg` | 18 | 1.125 | 28px (1.56) | -0.005em | 카드 제목, 모바일 본문 |
| `text-xl` | 20 | 1.25 | 28px (1.4) | -0.01em | 섹션 제목 |
| `text-2xl` | 24 | 1.5 | 32px (1.33) | -0.015em | 페이지 제목 보조 |
| `text-3xl` | 30 | 1.875 | 36px (1.2) | -0.02em | 페이지 제목 |
| `text-4xl` | 36 | 2.25 | 40px (1.11) | -0.025em | "이번 달 점검 시작" 등 강조 |

> **50대 사용자 배려**: 모바일 본문 기본은 `text-base(16px)`이 아니라 `text-lg(18px)`. 점검자 대시보드/입력은 `text-lg` 기본.

### 3.3 Font Weight

| Weight | Token | 용도 |
|--------|-------|------|
| 400 | `font-normal` | 본문 |
| 500 | `font-medium` | 강조 본문, 라벨 |
| 600 | `font-semibold` | 카드 제목, 버튼 |
| 700 | `font-bold` | 페이지 제목, 위험 알림 |

### 3.4 Reading Block

- 본문 line-height: 1.5–1.6 (한글 가독성).
- 한 줄 너비: 최대 70ch (모바일 가득, 데스크톱 max-w-2xl).
- 단락 간격: 1.0em.

---

## 4. 스페이싱 · 그리드

### 4.1 기본 단위

Tailwind 기본 4px(spacing-1). 모든 간격은 4의 배수.

```
spacing-0   = 0px
spacing-1   = 4px
spacing-2   = 8px
spacing-3   = 12px
spacing-4   = 16px   ← 모바일 페이지 패딩
spacing-5   = 20px
spacing-6   = 24px   ← 데스크톱 페이지 패딩
spacing-8   = 32px
spacing-10  = 40px
spacing-12  = 48px   ← 섹션 간격
spacing-16  = 64px
```

### 4.2 페이지 레이아웃

| 환경 | 패딩 | 최대 너비 |
|------|------|-----------|
| 모바일 (<768px) | `px-4` (16px) | 100% |
| 태블릿 (768–1023px) | `px-6` (24px) | 100% |
| 데스크톱 (≥1024px) | `px-6` (24px) | `max-w-6xl` (1152px) — 관리자 화면 |
| 데스크톱 폼/리딩 | `px-6` | `max-w-2xl` (672px) |

### 4.3 컴포넌트 간격

| 요소 | 모바일 | 데스크톱 |
|------|--------|----------|
| 카드 패딩 | `p-4` (16px) | `p-6` (24px) |
| 카드 간 세로 간격 | `space-y-3` (12px) | `space-y-4` (16px) |
| 폼 필드 간 | `space-y-4` (16px) | `space-y-5` (20px) |
| 라벨 ↔ 입력 | `space-y-2` (8px) | `space-y-2` (8px) |
| 섹션 헤더 ↔ 콘텐츠 | `mb-4` (16px) | `mb-6` (24px) |
| 페이지 섹션 간 | `space-y-8` (32px) | `space-y-12` (48px) |
| 버튼 간 | `gap-2` (8px) | `gap-3` (12px) |

### 4.4 그리드

- 모바일: 1열 (스택).
- 태블릿: 2열 (대시보드 카드).
- 데스크톱: 3열 또는 12-column grid (관리자 테이블).
- gap: 모바일 `gap-3`(12px), 데스크톱 `gap-6`(24px).

### 4.5 Border Radius

| Token | px | 용도 |
|-------|-----|------|
| `rounded-none` | 0 | 테이블 셀 |
| `rounded-sm` | 2 | 배지 |
| `rounded` | 4 | 인풋 |
| `rounded-md` | 6 | 버튼 sm |
| `rounded-lg` | 8 | 버튼, 카드 |
| `rounded-xl` | 12 | 큰 카드, 시트 모달 상단 |
| `rounded-2xl` | 16 | 강조 카드, "이번 달 점검 시작" 버튼 |
| `rounded-full` | 9999 | 아바타, 배지 알약형 |

### 4.6 Elevation (그림자)

| Token | CSS | 용도 |
|-------|-----|------|
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | 보더 보조 |
| `shadow` | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` | 카드 |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | 호버 카드 |
| `shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1)` | 시트 모달 |
| `shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1)` | 다이얼로그 |

> **다크 모드**: 그림자 대신 `border-neutral-700`로 깊이 표현.

---

## 5. 컴포넌트 시스템 (shadcn/ui 기반)

### 5.1 Button

#### Anatomy

```
┌──────────────────────────┐
│ [icon] Label  [hint]     │
└──────────────────────────┘
   ↑      ↑       ↑
 12px   12px    optional
```

#### Variants

| Variant | 배경 | 텍스트 | 보더 | 용도 |
|---------|------|--------|------|------|
| `primary` | `primary-700` | white | none | 메인 액션 (점검 시작, 저장) |
| `secondary` | white | `primary-700` | `primary-200` | 보조 액션 (취소) |
| `danger` | `danger-600` | white | none | 삭제, 미점검 처리 |
| `ghost` | transparent | `neutral-700` | none | 헤더 뒤로가기 |
| `outline` | white | `neutral-700` | `neutral-300` | 보조 폼 액션 |

#### Sizes

| Size | Height | Padding-x | Font | 용도 |
|------|--------|-----------|------|------|
| `sm` | 36px | 12px | `text-sm` | 데스크톱 인라인 |
| `md` | **44px** | 16px | `text-base` | **모바일 기본** (44px = 터치 최소) |
| `lg` | 52px | 20px | `text-lg` | 모바일 메인 액션 |
| `xl` | 72px | 24px | `text-2xl` | "이번 달 점검 시작" |

#### Mobile Full-Width 규칙

모바일 주요 액션은 `w-full` 기본. 두 버튼 나란히 = 화면 좁아질 때 깨짐 → 세로 스택.

```tsx
// GOOD
<div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
  <Button variant="primary" size="md" className="w-full sm:w-auto">저장</Button>
  <Button variant="secondary" size="md" className="w-full sm:w-auto">취소</Button>
</div>
```

#### State

- Hover: 한 단계 어두운 색 (primary-700 → primary-800).
- Active: `scale-[0.97]` + transition 120ms.
- Disabled: opacity 50%, cursor not-allowed.
- Loading: 스피너 + 라벨 변경("저장 중…").

---

### 5.2 Input

#### Anatomy

```
[Label]
┌────────────────────────┐
│ Placeholder            │  ← height 48px (mobile)
└────────────────────────┘
[Hint or Error]
```

- Height: **48px (모바일)** / 40px (데스크톱).
- Padding-x: 16px / 12px.
- Font: `text-base` (16px) — **iOS 자동 줌 방지**.
- Border: `neutral-300` → focus `primary-500` (2px).
- Error: border `danger-500` + 메시지 `text-danger-600`.

---

### 5.3 RadioGroup (점검 12항목 핵심)

점검 12항목 입력은 라디오가 디폴트. 키보드 입력 최소화.

#### Anatomy (모바일 카드형)

```
┌────────────────────────────┐
│ 1. 외관 손상 여부            │
│ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ 정상 │ │ 이상 │ │ 해당 │ │  ← 각 64px 높이
│ │  ●   │ │      │ │ 없음 │ │
│ └──────┘ └──────┘ └──────┘ │
└────────────────────────────┘
```

- 옵션 카드 최소 높이 64px (장갑 손가락 고려).
- 선택된 옵션: 배경 `primary-50` + 보더 `primary-500` (2px) + 체크 아이콘.
- 간격: 옵션 간 8px (모바일) / 12px (데스크톱).
- 라벨 + 옵션 간격: 12px.

---

### 5.4 Checkbox

- 24×24px 박스 (터치 영역은 라벨 포함 44×44).
- 체크 시 `primary-700` 배경 + 흰색 체크 아이콘.

---

### 5.5 Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>장비 #ABC-001</CardTitle>
    <CardDescription>3층 로비</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

- 배경: `bg-white` (다크: `bg-neutral-900`).
- 보더: `border-neutral-200` (다크: `border-neutral-800`).
- 그림자: `shadow-sm`.
- 라운드: `rounded-xl` (12px).
- 패딩: `p-4` (모바일) / `p-6` (데스크톱).

---

### 5.6 Sheet (모바일 모달)

iOS 액션 시트 패턴. 모바일 모달은 무조건 Sheet.

#### Anatomy

```
┌─────────────────────┐
│        ─            │  ← 핸들 (드래그)
│ Title               │
│ ─────────────────── │
│ Content             │
│                     │
│ [Primary Button]    │  ← 풀 너비
│ [Secondary]         │
└─────────────────────┘
```

- 하단에서 슬라이드 업, 둥근 상단(`rounded-t-2xl`).
- 핸들: 36×4px `bg-neutral-300`, 상단 8px.
- 백드롭: `bg-black/40` + blur.
- 닫기: 핸들 드래그 다운 + 백드롭 탭.
- 최대 높이: `max-h-[90vh]`, 스크롤 내부.

---

### 5.7 Dialog (데스크톱 모달)

데스크톱 표준 모달. 모바일에서는 자동으로 Sheet로 폴백.

- 너비: `max-w-md` (448px) 기본, 폼은 `max-w-lg`.
- 패딩: `p-6`.
- 라운드: `rounded-xl`.
- 그림자: `shadow-xl`.

---

### 5.8 BottomTabBar (모바일 전용)

#### Anatomy

```
┌──────────────────────────────────┐
│  [홈]  [점검]  [이력]  [설정]     │  ← 64px 높이
│   ●     ○      ○      ○          │
│  Home  Check  Log    Settings    │
└──────────────────────────────────┘
```

- 높이: 64px + safe-area-inset-bottom.
- 4개 탭(점검자) / 5개 탭(관리자). 6개 이상 금지.
- 아이콘: 24×24, lucide-react.
- 라벨: `text-xs(12px) font-medium`.
- 액티브: `text-primary-700` + 아이콘 채움.
- 비활성: `text-neutral-500` + 아이콘 라인.
- 데스크톱(`md:`)에서는 사이드바로 전환.

---

### 5.9 TopAppBar

#### Anatomy

```
┌──────────────────────────────────┐
│ [←]  페이지 제목         [⋮]      │  ← 56px 높이
└──────────────────────────────────┘
```

- 높이: 56px (모바일) / 64px (데스크톱).
- 배경: `bg-white` + 하단 1px `border-neutral-200`.
- 좌측: 뒤로가기 또는 메뉴 햄버거.
- 중앙: 페이지 제목 (`text-lg font-semibold`).
- 우측: 액션 버튼 1–2개 (예: 저장, 더보기).

---

### 5.10 StatusBadge (정상/이상/미점검)

```tsx
<StatusBadge status="ok">정상</StatusBadge>
<StatusBadge status="warning">교체임박</StatusBadge>
<StatusBadge status="error">미점검</StatusBadge>
```

| Status | 배경 | 텍스트 | 아이콘 |
|--------|------|--------|--------|
| `ok` | `success-50` | `success-700` | `CheckCircle` |
| `warning` | `warning-50` | `warning-700` | `AlertTriangle` |
| `error` | `danger-50` | `danger-700` | `XCircle` |
| `neutral` | `neutral-100` | `neutral-700` | `Circle` |

- 높이: 24px (sm) / 28px (md).
- 아이콘 + 텍스트 = 색맹 사용자 보장.
- 라운드: `rounded-full`.

---

### 5.11 DDayBadge (D-7, D-30)

```tsx
<DDayBadge days={7} />   // 노랑(warning)
<DDayBadge days={-3} />  // 빨강(danger), "D+3 경과"
```

| 조건 | 색 | 표기 |
|------|-----|------|
| `days > 30` | `neutral-100` / `neutral-700` | `D-45` |
| `7 < days ≤ 30` | `warning-50` / `warning-700` | `D-15` |
| `0 ≤ days ≤ 7` | `danger-50` / `danger-700` | `D-3` |
| `days < 0` | `danger-500` / white | `D+3 경과` |

---

### 5.12 SignatureCanvas

#### 모바일: 풀스크린

```
┌──────────────────────────────┐
│ ✕                       다음 │
├──────────────────────────────┤
│                              │
│                              │
│      (서명 영역)             │
│                              │
│                              │
│                              │
├──────────────────────────────┤
│ [지우기]      [확인]         │
└──────────────────────────────┘
```

- 가로 모드 추천 알림 표시.
- 캔버스: 흰색 배경, 검은 펜(2.5px).
- 하단 액션 바 고정.

#### 데스크톱: 인라인

- 모달 내 400×200 캔버스.
- 마우스/펜 태블릿 지원.

#### 메타데이터

서명 PNG와 함께 저장:
```json
{
  "signedAt": "2026-05-01T09:23:14+09:00",
  "userId": "uuid",
  "userIp": "203.0.113.42",
  "userAgent": "Mozilla/5.0 ...",
  "deviceModel": "iPhone 14",
  "geolocation": { "lat": 37.5, "lng": 127.0 }
}
```

---

### 5.13 EmptyState

```
┌─────────────────────────┐
│                         │
│       [아이콘 64px]      │
│                         │
│   아직 점검 기록이       │
│   없습니다               │
│                         │
│   첫 점검을 시작하세요   │
│                         │
│   [점검 시작하기]        │
│                         │
└─────────────────────────┘
```

- 아이콘: 64×64, `text-neutral-400`.
- 제목: `text-xl font-semibold`.
- 설명: `text-base text-neutral-500`.
- CTA: 1개만.

### 5.14 ErrorState

- 아이콘: `AlertCircle`, `text-danger-500`.
- 메시지: 한 줄 설명 + 해결책 + 재시도 버튼.
- 절대 사용자 잘못으로 들리지 않게: "잠시 문제가 발생했습니다" (NOT "당신이 틀렸습니다").

### 5.15 LoadingState

- 스켈레톤 우선 (스피너보다 인지 부담 적음).
- `bg-neutral-200` + `animate-pulse`.
- 3초 이상 로딩 시 "처리 중입니다…" 텍스트 추가.

---

## 6. 6개 핵심 화면 와이어프레임

> 좌측: 모바일 (375px), 우측: 데스크톱 (1280px).

### 6.1 로그인 (이메일 → 매직 링크)

#### 모바일

```
┌─────────────────────┐
│                     │
│       [로고]        │
│                     │
│   AED 점검 시스템    │
│                     │
│                     │
│  이메일             │
│  ┌───────────────┐  │
│  │ name@org.kr   │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │  로그인 링크   │  │  ← Primary, h-52
│  │     받기       │  │
│  └───────────────┘  │
│                     │
│  · 비밀번호 없이      │
│    이메일로 안전하게  │
│                     │
└─────────────────────┘
```

#### 데스크톱

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                                                          │
│                  [로고]                                  │
│                                                          │
│              AED 점검 시스템                              │
│           기관용 매직 링크 로그인                          │
│                                                          │
│         ┌──────────────────────┐                         │
│         │ 이메일                │                         │
│         │ ┌──────────────────┐ │                         │
│         │ │ name@org.kr      │ │                         │
│         │ └──────────────────┘ │                         │
│         │                      │                         │
│         │ ┌──────────────────┐ │                         │
│         │ │  로그인 링크 받기  │ │                         │
│         │ └──────────────────┘ │                         │
│         │                      │                         │
│         │ 처음이신가요? 가입신청 │                         │
│         └──────────────────────┘                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

### 6.2 대시보드 (이번 달 점검 큰 버튼 + 미점검 알림)

#### 모바일

```
┌─────────────────────┐
│ ☰  대시보드      🔔 │  ← TopAppBar 56px
├─────────────────────┤
│                     │
│  안녕하세요, 김점검 │  ← text-2xl
│  서울시 강남구       │
│                     │
│ ┌───────────────┐  │
│ │ ⚠ 미점검 3건  │  │  ← danger-50 카드
│ │   확인 →      │  │
│ └───────────────┘  │
│                     │
│ ╔═════════════════╗ │
│ ║                 ║ │
│ ║  이번 달 점검    ║ │  ← 거대 버튼
│ ║   시작하기      ║ │     (h-72, text-4xl)
│ ║                 ║ │     bg-primary-700
│ ║   12개 장비     ║ │
│ ╚═════════════════╝ │
│                     │
│ ┌────────┐┌────────┐│
│ │완료 9  ││남은 3  ││  ← KPI 카드
│ │ ✓     ││ ⚠     ││
│ └────────┘└────────┘│
│                     │
│ 최근 활동            │
│ ┌─────────────────┐ │
│ │ ○ 5/1 09:12     │ │
│ │   #ABC-001 정상 │ │
│ ├─────────────────┤ │
│ │ ○ 4/30 15:30    │ │
│ │   #ABC-008 교체 │ │
│ └─────────────────┘ │
│                     │
├─────────────────────┤
│ [홈][점검][이력][⋮] │  ← BottomTabBar
└─────────────────────┘
```

#### 데스크톱

```
┌──────────────────────────────────────────────────────────┐
│ [Logo] AED 점검    검색…           [알림] [김점검 ▾]      │
├──────┬───────────────────────────────────────────────────┤
│      │                                                   │
│ 홈   │  대시보드                                  2026.5.1│
│ 점검 │                                                   │
│ 이력 │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ 장비 │  │총 장비   │ │이번 달   │ │미점검    │ │교체임박  │ │
│ 보고 │  │  12     │ │  9 / 12 │ │   3 ⚠   │ │   2 ⚠  │ │
│ 설정 │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│      │                                                   │
│      │  ┌───────────────────────┐ ┌───────────────────┐  │
│      │  │ 미점검 장비           │ │ 이번 달 점검       │  │
│      │  │ ───────────────────── │ │ 시작하기           │  │
│      │  │ ⚠ #ABC-001 (3층 로비) │ │                   │  │
│      │  │ ⚠ #ABC-005 (B1 주차) │ │ [    시작     ]   │  │
│      │  │ ⚠ #ABC-008 (정문)    │ │                   │  │
│      │  └───────────────────────┘ └───────────────────┘  │
│      │                                                   │
│      │  최근 활동                                        │
│      │  ┌─────────────────────────────────────────────┐ │
│      │  │ 시각      장비       결과    점검자          │ │
│      │  │ 5/1 09:12 #ABC-001  ✓정상   김점검          │ │
│      │  │ 4/30 15:30 #ABC-008 ⚠교체   이점검          │ │
│      │  └─────────────────────────────────────────────┘ │
│      │                                                   │
└──────┴───────────────────────────────────────────────────┘
```

---

### 6.3 점검 입력 (12항목 라디오 + 자동기재)

#### 모바일

```
┌─────────────────────┐
│ ←  점검 (3 / 12) ⋮ │  ← TopAppBar
├─────────────────────┤
│ ▓▓▓▓▓▓░░░░░░ 25%   │  ← 진행 바
│                     │
│ 장비 #ABC-001        │
│ 3층 로비             │
│ ─────────────────── │
│                     │
│ 3. 패드 유효기간     │
│    (만료: 2026.07)   │
│                     │
│ ┌─────┐┌─────┐┌────┐│
│ │ 정상││ 이상││해당││  ← 64px 높이
│ │  ●  ││     ││없음││
│ └─────┘└─────┘└────┘│
│                     │
│ 메모 (선택)          │
│ ┌─────────────────┐ │
│ │                 │ │
│ │                 │ │
│ └─────────────────┘ │
│                     │
│ [↺ 직전과 동일]     │  ← 자동기재 버튼
│                     │
├─────────────────────┤
│ [이전]      [다음 →] │  ← 하단 고정 액션
└─────────────────────┘
```

#### 데스크톱

```
┌──────────────────────────────────────────────────────────┐
│ ← 점검 입력 #ABC-001 (3층 로비)              저장  취소  │
├──────────────────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░ 3 / 12 (25%)                  │
│                                                          │
│ ┌──────────────────────────┬──────────────────────────┐ │
│ │ 점검 항목                 │ 장비 정보                 │ │
│ │                          │                          │ │
│ │ 1. ✓ 외관 손상            │ 모델: HeartSine 350P     │ │
│ │ 2. ✓ 케이스 청결          │ 일련번호: ABC-001        │ │
│ │ 3. ● 패드 유효기간 ←      │ 위치: 3층 로비           │ │
│ │ 4. ○ 배터리 잔량          │ 설치일: 2024.03.15       │ │
│ │ 5. ○ 표시등 점등          │ 직전점검: 2026.04.02     │ │
│ │ 6. ○ ...                  │                          │ │
│ │                          │ [지도 보기]              │ │
│ │ ──────────────────       │                          │ │
│ │ ◉ 정상  ○ 이상  ○ 해당없음│                          │ │
│ │                          │                          │ │
│ │ 메모:                     │                          │ │
│ │ ┌──────────────────────┐ │                          │ │
│ │ │                      │ │                          │ │
│ │ └──────────────────────┘ │                          │ │
│ └──────────────────────────┴──────────────────────────┘ │
│                                                          │
│              [← 이전]              [다음 →]              │
└──────────────────────────────────────────────────────────┘
```

---

### 6.4 서명 (풀스크린 캔버스)

#### 모바일

```
┌─────────────────────┐
│ ✕              다음 │
├─────────────────────┤
│                     │
│  📱 가로 모드 권장   │
│                     │
│ ─────────────────── │
│                     │
│                     │
│                     │
│       (서명)        │
│                     │
│                     │
│                     │
│ ─────────────────── │
│ 김점검 / 2026.5.1   │
│                     │
│ [지우기]   [확인]   │
└─────────────────────┘
```

#### 데스크톱

```
┌──────────────────────────────────────────────────────────┐
│ 서명 확인                                          ✕     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  점검자: 김점검                                          │
│  점검일: 2026-05-01 09:23                                │
│  장비: 12건 (이번 달 점검 일괄 서명)                       │
│                                                          │
│  ┌──────────────────────────────────────────┐           │
│  │                                          │           │
│  │                                          │           │
│  │            (서명 영역 600×200)            │           │
│  │                                          │           │
│  │                                          │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  ☐ 위 점검 결과가 사실임을 확인합니다.                    │
│                                                          │
│              [지우기]  [취소]  [서명 완료]                │
└──────────────────────────────────────────────────────────┘
```

---

### 6.5 발송 확인 (DOCX/PDF 미리보기 + 발송 버튼)

#### 모바일

```
┌─────────────────────┐
│ ←  보고서 발송       │
├─────────────────────┤
│                     │
│ ✓ 점검 12건 완료    │
│ ✓ 서명 확인 완료    │
│                     │
│ ┌─────────────────┐ │
│ │ [PDF 미리보기]   │ │  ← 탭 시 풀스크린
│ │ ──────────────  │ │
│ │ 2026년 5월       │ │
│ │ AED 점검 보고서  │ │
│ │ ──────────────  │ │
│ │ 강남구 보건소…   │ │
│ │     [확대]      │ │
│ └─────────────────┘ │
│                     │
│ 받는 사람            │
│ ┌─────────────────┐ │
│ │ admin@org.kr ✓  │ │
│ └─────────────────┘ │
│ + 추가              │
│                     │
│ ☑ DOCX 함께 첨부     │
│                     │
├─────────────────────┤
│ [    발송하기    ]  │
└─────────────────────┘
```

#### 데스크톱

```
┌──────────────────────────────────────────────────────────┐
│ ← 보고서 발송                                            │
├──────────────────────────┬───────────────────────────────┤
│                          │  발송 정보                     │
│                          │                               │
│   ┌─────────────────┐   │  받는 사람:                    │
│   │ 2026년 5월      │   │  ✓ admin@org.kr              │
│   │ AED 점검 보고서  │   │  ✓ safety@org.kr             │
│   │                 │   │  + 추가                        │
│   │ 강남구 보건소    │   │                               │
│   │ ─────────────── │   │  파일:                         │
│   │ 점검 12건 / 정상│   │  ☑ PDF (812 KB)               │
│   │ ...             │   │  ☑ DOCX (1.2 MB)              │
│   │                 │   │                               │
│   │ [PDF / DOCX 탭] │   │  메시지(선택):                 │
│   └─────────────────┘   │  ┌─────────────────────┐      │
│                          │  │                     │      │
│   [페이지 1 / 4]         │  └─────────────────────┘      │
│                          │                               │
│                          │  [미리보기]  [발송하기]       │
└──────────────────────────┴───────────────────────────────┘
```

---

### 6.6 이력 (캘린더, 미점검 빨강)

#### 모바일

```
┌─────────────────────┐
│ ←  점검 이력      ⋮ │
├─────────────────────┤
│ ◀  2026년 5월   ▶  │
│ ─────────────────── │
│ 일 월 화 수 목 금 토│
│              1  2  3│
│  ●           ●     │  ← 점: 점검일
│  4  5  6  7  8  9 10│
│  ●  ●  ●  ⚠  ●     │  ← ⚠: 미점검
│ 11 12 13 14 15 16 17│
│                     │
│ ─────────────────── │
│ 5월 1일 (오늘)       │
│                     │
│ ┌─────────────────┐ │
│ │ ✓ #ABC-001 정상 │ │
│ │   09:12 김점검  │ │
│ ├─────────────────┤ │
│ │ ⚠ #ABC-005 이상 │ │  ← danger-50 배경
│ │   09:24 김점검  │ │
│ └─────────────────┘ │
│                     │
├─────────────────────┤
│ [홈][점검][이력][⋮] │
└─────────────────────┘
```

#### 데스크톱

```
┌──────────────────────────────────────────────────────────┐
│ 점검 이력                              [필터] [내보내기]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────────────────────┐ ┌──────────────────────────┐│
│ │  2026년 5월             │ │ 5월 1일 점검 (12건)       ││
│ │ ─────────────────────── │ │ ─────────────────────────││
│ │  일 월 화 수 목 금 토   │ │ 시각   장비       결과    ││
│ │              1  2  3   │ │ 09:12  #ABC-001   ✓정상  ││
│ │              ●         │ │ 09:18  #ABC-002   ✓정상  ││
│ │  4  5  6  7  8  9 10   │ │ 09:24  #ABC-005   ⚠이상  ││
│ │  ●  ●  ●  ⚠  ●         │ │ ...                      ││
│ │ 11 12 13 14 15 16 17   │ │                          ││
│ │                        │ │ [상세 보기] [PDF 내려받기]││
│ │ 18 19 20 21 22 23 24   │ │                          ││
│ │ 25 26 27 28 29 30 31   │ │                          ││
│ └─────────────────────────┘ └──────────────────────────┘│
│                                                          │
│ 월별 통계: 정상 89% / 이상 8% / 미점검 3%                 │
└──────────────────────────────────────────────────────────┘
```

---

## 7. 모션 · 전환

### 7.1 원칙

- **빠르고 의도적**: 200–300ms 기본. 500ms 초과 금지(대기 시간으로 인지).
- **prefers-reduced-motion 존중**: 반드시 OS 설정 따름.
- **레이아웃 시프트 0**: 애니메이션 중 다른 요소 위치 이동 금지.

### 7.2 표준 이징

```css
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);   /* 기본 */
--ease-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1); /* 진입 */
--ease-accelerate: cubic-bezier(0.4, 0.0, 1, 1);   /* 퇴장 */
```

### 7.3 표준 지속시간

| Token | ms | 용도 |
|-------|-----|------|
| `duration-fast` | 120 | 버튼 active, 호버 |
| `duration-base` | 200 | 토글, 토스트 |
| `duration-slow` | 300 | 시트 모달, 페이지 전환 |
| `duration-slower` | 500 | 첫 화면 진입 |

### 7.4 컴포넌트 모션

| 컴포넌트 | 모션 |
|----------|------|
| Sheet | translate-y-full → 0, 300ms decelerate |
| Dialog | scale-95 + opacity-0 → 100% / 100%, 200ms standard |
| Toast | translate-y-2 + opacity-0 → 0 / 100%, 200ms decelerate |
| Button active | scale-100 → 0.97, 120ms standard |
| Page transition | opacity 0 → 100, 200ms — Next.js view transition |
| Tab indicator | translate-x, 200ms standard |

### 7.5 햅틱

- iOS Safari `Haptics API` 또는 Capacitor 사용 시:
  - 점검 항목 선택: `impactLight`.
  - 저장 성공: `notificationSuccess`.
  - 미점검/위험 확인: `notificationWarning`.

---

## 8. 접근성 (WCAG 2.1 AA)

### 8.1 색 대비

- 본문 텍스트 4.5:1 이상.
- 18pt 이상 큰 텍스트 3:1 이상.
- UI 컴포넌트(보더, 아이콘) 3:1 이상.
- **점검 결과 색**은 절대 색만으로 의미 전달 금지 → 아이콘 + 텍스트 동반.

### 8.2 터치 영역

- 최소 44×44px (iOS HIG).
- 권장 48×48px (Material).
- 인접 타깃 간 8px 이상 간격.

### 8.3 키보드 네비게이션

- 모든 인터랙티브 요소 Tab 도달 가능.
- Focus ring: `outline-2 outline-offset-2 outline-primary-500` (다크: `outline-primary-300`).
- Esc로 모달 닫기.
- Enter/Space로 버튼 활성화.

### 8.4 ARIA 패턴

- 라이브 리전: 저장 성공/실패 토스트는 `aria-live="polite"`.
- 다이얼로그: `role="dialog" aria-modal="true" aria-labelledby="…"`.
- 라디오: `role="radiogroup" aria-labelledby="…"`.
- 폼 에러: `aria-describedby` + `aria-invalid="true"`.
- 진행 표시: `role="progressbar" aria-valuenow aria-valuemax`.

### 8.5 스크린리더

- 한국어 화면 리더(보이스오버 한국어) 우선 검증.
- 아이콘 단독 버튼: `aria-label="뒤로 가기"` 필수.
- 빈 라벨 금지. 모든 입력은 가시 라벨 + `<label htmlFor>`.
- 표는 `<th scope="col">` / `<th scope="row">` 명시.

### 8.6 폰트 크기 사용자 설정

- `rem` 단위 기본. 16px 가정 후 사용자 설정 200%까지 깨지지 않게.
- `text-[16px]` 같은 px 고정 금지.

### 8.7 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 8.8 50대 이상 사용자 추가 배려

- 모바일 본문 18px 기본 (16 대신).
- 버튼 라벨은 명령어 동사 ("저장", "다음", "확인") — "OK", "Cancel" 영어 약어 금지.
- 시간 제한 없음 (자동 로그아웃은 30분 전 경고).
- 실수 복구 가능 (모든 파괴적 액션은 Undo 또는 확인 다이얼로그).

---

## 9. 다국어 (i18n)

### 9.1 기본

- 라이브러리: `next-intl` (Next.js App Router 호환).
- 메시지 파일: `messages/ko.json`, `messages/en.json`.
- 기본 로케일: 한국어 (`ko`).
- URL: `/ko/...`, `/en/...` (도메인 분기 아님).

### 9.2 우선순위

| 우선 | 언어 | 범위 |
|------|------|------|
| 1순위 | 한국어 | 전체 UI, 보고서 본문, 이메일 |
| 2순위 | English | UI 라벨, 에러 메시지, 약식 보고서 |

### 9.3 토글

- 설정 > 언어 메뉴에서 변경.
- 헤더 우측 작은 ko/en 토글(데스크톱).

### 9.4 날짜·시간 포맷

| 로케일 | 날짜 | 시간 | 결합 |
|--------|------|------|------|
| ko | 2026.05.01 | 오전 9:23 | 2026.05.01 (금) 오전 9:23 |
| en | May 1, 2026 | 9:23 AM | Fri, May 1, 2026 9:23 AM |

```typescript
// utils/format-date.ts
import { format } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'

const locales = { ko, en: enUS } as const

export function formatDate(date: Date, locale: 'ko' | 'en') {
  const pattern = locale === 'ko' ? 'yyyy.MM.dd (EEE)' : 'EEE, MMM d, yyyy'
  return format(date, pattern, { locale: locales[locale] })
}
```

### 9.5 숫자·통화

- 일련번호: 항상 raw (지역화 없음). 예: `ABC-001`.
- 카운트: `Intl.NumberFormat` 사용. 예: `1,234`.
- 통화: 본 SaaS는 통화 표기 없음 (의료 점검 도메인).

### 9.6 한국어 특수 처리

- 줄바꿈: 한국어는 어절 단위 줄바꿈 (`word-break: keep-all` + `overflow-wrap: anywhere`).
- 문장부호: 한국어 마침표 `.` (한자 마침표 `。` 사용 금지).
- 조사: i18n에서 동적 조사(은/는, 이/가) 처리는 메시지 분기로 해결.

```json
// messages/ko.json
{
  "deviceUnchecked": "{deviceName, select, _ {장비가} other {{deviceName}이(가)}} 미점검 상태입니다."
}
```

---

## 10. Tailwind config 코드

### 10.1 `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@aed-saas/ui/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF4FB',
          100: '#DBE5F4',
          200: '#B7CAE9',
          300: '#8AA6D7',
          400: '#5C82C4',
          500: '#3A60B0',
          600: '#2C4F9A',
          700: '#1E40AF',
          800: '#1A3585',
          900: '#152A66',
          DEFAULT: '#1E40AF',
        },
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#059669',
          600: '#047857',
          700: '#065F46',
          DEFAULT: '#059669',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#D97706',
          600: '#B45309',
          700: '#92400E',
          DEFAULT: '#D97706',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#DC2626',
          600: '#B91C1C',
          700: '#991B1B',
          DEFAULT: '#DC2626',
        },
        neutral: {
          0: '#FFFFFF',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
        en: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'D2Coding', 'Menlo', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.005em' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em' }],
      },
      spacing: {
        // Tailwind 기본 4px 단위 활용
        // 추가 토큰
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
      minHeight: {
        touch: '44px',
        'touch-md': '48px',
        'touch-lg': '52px',
        'touch-xl': '64px',
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        'sheet': '0 -4px 20px -2px rgb(0 0 0 / 0.15)',
      },
      transitionTimingFunction: {
        'standard': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        'decelerate': 'cubic-bezier(0.0, 0.0, 0.2, 1)',
        'accelerate': 'cubic-bezier(0.4, 0.0, 1, 1)',
      },
      transitionDuration: {
        'fast': '120ms',
        'base': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      },
      keyframes: {
        'sheet-in': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'sheet-in': 'sheet-in 300ms cubic-bezier(0.0, 0.0, 0.2, 1)',
        'fade-in': 'fade-in 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}

export default config
```

### 10.2 `globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --bg-page: 248 250 252;
    --bg-surface: 255 255 255;
    --bg-surface-2: 241 245 249;
    --text-primary: 15 23 42;
    --text-secondary: 71 85 105;
    --border-default: 226 232 240;
    --brand: 30 64 175;
    --success: 4 120 87;
    --warning: 180 83 9;
    --danger: 185 28 28;
  }

  .dark {
    --bg-page: 2 6 23;
    --bg-surface: 15 23 42;
    --bg-surface-2: 30 41 59;
    --text-primary: 248 250 252;
    --text-secondary: 148 163 184;
    --border-default: 51 65 85;
    --brand: 92 130 196;
    --success: 52 211 153;
    --warning: 251 191 36;
    --danger: 248 113 113;
  }

  html {
    font-family: theme('fontFamily.sans');
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
  }

  body {
    background: rgb(var(--bg-page));
    color: rgb(var(--text-primary));
    word-break: keep-all;
    overflow-wrap: anywhere;
  }

  /* iOS 자동 줌 방지 */
  input, textarea, select {
    font-size: 16px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}

@layer components {
  .btn-touch {
    @apply min-h-touch min-w-touch;
  }

  .focus-ring {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2;
  }

  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

### 10.3 폰트 로딩

```typescript
// app/layout.tsx
import localFont from 'next/font/local'
import { Inter } from 'next/font/google'

const pretendard = localFont({
  src: '../public/fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
  weight: '45 920',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${inter.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

---

## 11. 변경 관리

- 본 문서 변경은 PR 필수.
- 컴포넌트 추가 시: 본 문서 → Storybook → shadcn 컴포넌트 코드 순서.
- 토큰 변경 시 영향 범위 분석 첨부.
- Major 변경(컬러 베이스, 폰트 패밀리)은 디자인 리뷰 미팅.

---

## 12. 부록

### 12.1 참고 자료

- iOS Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Material Design 3: https://m3.material.io/
- WCAG 2.1: https://www.w3.org/TR/WCAG21/
- Pretendard: https://github.com/orioncactus/pretendard
- shadcn/ui: https://ui.shadcn.com/

### 12.2 디자인 토큰 자동화 (TODO)

- Figma Tokens → JSON → Tailwind 자동 동기화 파이프라인.
- Style Dictionary 도입 검토.

### 12.3 미해결 이슈

- [ ] 음성 입력으로 "정상" 한 마디로 12항목 일괄 처리 (점검자 인터뷰 필요).
- [ ] 오프라인 모드 UI 패턴 (Service Worker + IndexedDB 기반).
- [ ] 점검 사진 첨부 시 EXIF 위치정보 자동 표기 vs 프라이버시 트레이드오프.
