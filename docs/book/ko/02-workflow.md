---
title: "2장. 4단계 워크플로우의 발견"
slug: "workflow"
chapter: 2
words_target: 3000
screenshots:
  - ch02-step01-workflow-diagram
  - ch02-step02-mobile-inspection-flow
  - ch02-step03-admin-review-screen
  - ch02-step04-monthly-report-pdf
  - ch02-step05-information-architecture
---

# 2장. 4단계 워크플로우의 발견

## 학습 목표

- 점검 워크플로우를 4단계(예약·점검·검토·보고)로 분해하는 이유를 이해한다
- 각 단계에서 누가, 어떤 화면에서, 무엇을 입력·출력하는지 식별한다
- 모바일 우선(점검자) + 데스크톱 우선(관리자) 화면 분기 원칙을 설명한다
- 워크플로우 단계와 도메인 모델 사이의 매핑을 도식화한다
- 워크플로우 도식이 IA(정보 구조) 설계에 어떻게 직결되는지 보인다

## 핵심 개념

종이 점검표는 모든 일을 한 단계로 압축한다 — "그냥 칸을 채운다." 디지털화는
이 한 단계를 4단계로 풀어낸다. **예약(Schedule) → 점검(Inspect) → 검토(Review)
→ 보고(Report)**. 각 단계는 서로 다른 사용자, 서로 다른 화면, 서로 다른 검증
규칙을 가진다. 이 4단계가 본 SaaS 화면 IA의 뼈대를 결정한다.

<!-- SCREENSHOT: ch02-step01-workflow-diagram -->
![4단계 워크플로우 도식 — 예약·점검·검토·보고](../assets/screenshots/ch02-step01-workflow-diagram.png)
*그림 2-1. 4단계 파이프라인. 좌→우로 흐르며, 각 단계의 입력/출력/책임자가 화살표 위에 표시된다.*
<!-- /SCREENSHOT -->

## 2.1 1단계 — 예약 (Schedule)

매월 1일 00:00에 cron-worker가 모든 활성 AED에 대해 그 달의 점검 일정을 자동
생성한다. 사람이 일일이 "이번 달 100대 점검 만들어줘"라고 누를 필요가 없다.

<!-- TODO: ch12 cron-worker 코드 발췌와 연결 -->

### 2.1.1 트리거

- cron 표현식: `0 0 1 * *` (매월 1일 자정)
- 입력: 활성 디바이스 목록
- 출력: `inspection_schedule` 레코드 N건

### 2.1.2 실패 시나리오

cron 컨테이너가 죽어 있으면 점검이 영영 생성되지 않는다 → Uptime Kuma 헬스체크로
보강 (15장).

## 2.2 2단계 — 점검 (Inspect)

점검자는 모바일에서 12항목 폼을 채우고, 서명을 그리고, 사진을 첨부한다.

<!-- SCREENSHOT: ch02-step02-mobile-inspection-flow -->
![모바일 점검 폼 흐름 — 5개 화면의 시퀀스](../assets/screenshots/ch02-step02-mobile-inspection-flow.png)
*그림 2-2. 점검자 모바일 흐름. (1) 디바이스 선택 → (2) 12항목 입력 → (3) 사진 첨부 → (4) 서명 → (5) 제출 완료.*
<!-- /SCREENSHOT -->

### 2.2.1 자동기재 UX

지난달 점검값 + 디바이스 메타데이터를 기본값으로 끌어와 점검자가 "변경된 것만"
누르도록 한다. 8장에서 자세히 다룬다.

### 2.2.2 오프라인 큐

지하 1층 점검 시 신호가 끊기는 일이 잦다 → 입력값을 IndexedDB에 큐잉, 신호
복귀 시 일괄 전송.

## 2.3 3단계 — 검토 (Review)

관리자는 데스크톱에서 점검 결과를 일괄 확인하고 승인·반려한다.

<!-- SCREENSHOT: ch02-step03-admin-review-screen -->
![관리자 검토 화면 — 100건의 이번 달 점검 결과 일괄 검토](../assets/screenshots/ch02-step03-admin-review-screen.png)
*그림 2-3. 관리자 데스크톱 검토 화면. 좌측 필터(미검토/반려/승인), 우측 12항목 요약 + 사진 미리보기.*
<!-- /SCREENSHOT -->

### 2.3.1 일괄 승인

100대를 일일이 클릭하면 운영이 안 된다. 필터링된 결과 일괄 승인 버튼을 둔다.

### 2.3.2 반려 코멘트

반려 시 코멘트가 점검자에게 푸시되고, 점검자는 모바일에서 즉시 재작성할 수 있다.

## 2.4 4단계 — 보고 (Report)

월말이 되면 시스템이 보고서를 자동 생성하고 보건소·관리자에게 발송한다.

<!-- SCREENSHOT: ch02-step04-monthly-report-pdf -->
![월간 보고서 PDF — 100대 점검 결과 + 미점검 사유](../assets/screenshots/ch02-step04-monthly-report-pdf.png)
*그림 2-4. 자동 생성된 월간 보고서 PDF 1쪽. 시설명, 기간, 12항목 통계, 미점검 디바이스 목록을 포함한다.*
<!-- /SCREENSHOT -->

### 2.4.1 DOCX + PDF 동시

10장에서 자세히 다룬다. 핵심: 보건소는 DOCX 편집을 원하고, 시설은 PDF 보존을 원한다.

### 2.4.2 R2 영구 보관

생성 즉시 R2(Cloudflare 객체 스토리지)에 SHA-256 해시 + presigned URL로 보관한다.

## 2.5 IA(정보 구조) 매핑

<!-- SCREENSHOT: ch02-step05-information-architecture -->
![IA 매핑 — 4단계가 곧 4개 메인 메뉴](../assets/screenshots/ch02-step05-information-architecture.png)
*그림 2-5. 사이드바 IA. (1) 일정, (2) 점검, (3) 검토, (4) 보고서가 그대로 4개 워크플로우 단계에 대응된다.*
<!-- /SCREENSHOT -->

```
사이드바
├─ 일정         (1단계 결과 확인)
├─ 점검         (2단계 입력 — 모바일 우선)
├─ 검토         (3단계 처리 — 데스크톱 우선)
└─ 보고서       (4단계 결과물 다운로드)
```

워크플로우와 IA가 이렇게 1:1로 맞아떨어지면 사용자는 화면을 보지 않고도 다음
단계를 안다.

<!-- TODO: 실제 운영 데이터로 단계별 평균 소요 시간 차트 추가 -->

## 요약

- 4단계 워크플로우(예약·점검·검토·보고)가 본 SaaS 의 뼈대다
- 단계마다 사용자·디바이스·검증 규칙이 다르다 — 모바일/데스크톱 분기 원칙
- 워크플로우 도식이 곧 IA가 되어 사용자 학습 곡선을 낮춘다
- cron 자동 예약 + 자동기재 UX + 일괄 검토 + 자동 보고서가 종이 대비 핵심 차별점

## 다음 장 미리보기

다음 장에서는 우리가 왜 Supabase·Vercel을 배제했는지, 자체 호스팅 + Cloudflare
Edge라는 비주류 조합을 끝까지 끌고 간 이유를 솔직히 정리한다.

## 캡처 체크리스트

- [ ] `ch02-step01-workflow-diagram.png` — Mermaid 다이어그램 캡처
- [ ] `ch02-step02-mobile-inspection-flow.png` — 모바일 5개 화면 합성
- [ ] `ch02-step03-admin-review-screen.png` — 데스크톱 검토 화면 (모자이크: 시설명)
- [ ] `ch02-step04-monthly-report-pdf.png` — PDF 1쪽 미리보기
- [ ] `ch02-step05-information-architecture.png` — 사이드바 트리 다이어그램
