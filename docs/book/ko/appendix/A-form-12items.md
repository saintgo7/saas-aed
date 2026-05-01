---
title: "부록 A. 보건복지부 고시 12개 점검 항목 양식"
slug: "appendix-form-12items"
appendix: "A"
words_target: 2000
screenshots:
  - app-a-step01-official-form-original
  - app-a-step02-form-mapping-to-columns
  - app-a-step03-validation-rule-table
---

# 부록 A. 보건복지부 고시 12개 점검 항목 양식

## 학습 목표

- 보건복지부 고시 「자동심장충격기 관리·운영지침」의 12개 항목을 정확히 식별한다
- 각 항목과 본 SaaS 의 DB 컬럼 매핑을 확인한다
- 검증 규칙(필수/타입/범위)을 표로 정리한다

## 핵심 개념

법령은 12개 항목을 강제하지만 표기·순서·언어는 시설마다 약간씩 다르다. 본 SaaS
는 **법령 원문 기준 12 항목**을 표준으로 삼고, 시설별 라벨은 i18n 으로 분리한다.

<!-- SCREENSHOT: app-a-step01-official-form-original -->
![보건복지부 고시 양식 원문 — 12 항목 표](../assets/screenshots/app-a-step01-official-form-original.png)
*그림 A-1. 고시 별표 양식. 표 좌측이 법령 항목, 우측이 점검자 기재란.*
<!-- /SCREENSHOT -->

## A.1 12 항목 매핑표

| # | 법령 항목 | 우리 컬럼 | 타입 | 필수 |
|---|---|---|---|---|
| 1 | 패드 만료일 | item01_padExpiry | date | Y |
| 2 | 배터리 잔량 | item02_batteryLevel | smallint (0-100) | Y |
| 3 | 배터리 만료일 | item03_batteryExpiry | date | Y |
| 4 | 자가 진단 결과 | item04_selfTest | enum(pass,fail,na) | Y |
| 5 | 외관 손상 | item05_exterior | enum(ok,damage) | Y |
| 6 | 청결 상태 | item06_cleanliness | enum(ok,need_clean) | Y |
| 7 | 안내 표지 | item07_signage | enum(ok,missing) | Y |
| 8 | 잠금/개폐 | item08_lock | enum(ok,locked,broken) | Y |
| 9 | 사용설명서 비치 | item09_manual | boolean | Y |
| 10 | 응급연락망 게시 | item10_emergency_contact | boolean | Y |
| 11 | 사용 후 점검 (있는 경우) | item11_post_use | text | N |
| 12 | 기타 특이사항 | item12_notes | text | N |

<!-- SCREENSHOT: app-a-step02-form-mapping-to-columns -->
![매핑 시각화 — 법령 항목 ↔ 컬럼 ↔ Zod 스키마](../assets/screenshots/app-a-step02-form-mapping-to-columns.png)
*그림 A-2. 한 화면에 3개 표 — 법령, DB 컬럼, Zod 스키마.*
<!-- /SCREENSHOT -->

## A.2 검증 규칙 표

<!-- SCREENSHOT: app-a-step03-validation-rule-table -->
![검증 규칙 표 — 항목별 boundary case](../assets/screenshots/app-a-step03-validation-rule-table.png)
*그림 A-3. 만료일은 -3년 ~ +5년, 배터리는 0-100, enum 은 정확 일치. boundary 케이스는 통합 테스트로 자동.*
<!-- /SCREENSHOT -->

## A.3 시설별 라벨 (i18n)

```ts
// lib/i18n/inspection-items.ko.ts (예시)
export const items = {
  item01_padExpiry: { label: "패드 만료일", short: "패드" },
  item02_batteryLevel: { label: "배터리 잔량(%)", short: "배터리" },
  // ...
}
```

<!-- TODO: 실제 i18n 파일 발췌 -->

## 캡처 체크리스트

- [ ] `app-a-step01-official-form-original.png`
- [ ] `app-a-step02-form-mapping-to-columns.png`
- [ ] `app-a-step03-validation-rule-table.png`
