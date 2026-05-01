---
title: "부록 C. 운영 체크리스트"
slug: "appendix-ops-checklist"
appendix: "C"
words_target: 2000
screenshots:
  - app-c-step01-daily-checklist
  - app-c-step02-weekly-checklist
  - app-c-step03-monthly-checklist
  - app-c-step04-runbook-template
---

# 부록 C. 운영 체크리스트

## 학습 목표

- 일/주/월/분기 4단계 운영 체크리스트를 식별한다
- 각 항목에 명시적 시간을 부여하고 캘린더화한다
- 런북(runbook) 템플릿으로 사고 대응 시간을 단축한다

## 핵심 개념

운영의 진짜 비용은 **잊어버림**이다. 매일 해야 할 5분짜리 일을 잊고 한 달 후
사고로 만난다. 체크리스트는 이 망각 비용을 0 에 가깝게 한다.

## C.1 일일 체크리스트 (5분)

- [ ] Uptime Kuma — 모든 모니터 녹색
- [ ] Slack #ops 채널 알람 0건
- [ ] 어제 backup-daily push 도착 확인
- [ ] 어제 5분 간격 retry-failed 잡 dead-letter 확인
- [ ] Cloudflare Analytics 5xx 1% 미만

<!-- SCREENSHOT: app-c-step01-daily-checklist -->
![일일 체크리스트 — Notion / Linear 템플릿](../assets/screenshots/app-c-step01-daily-checklist.png)
*그림 C-1. 매일 09:00 자동 생성 태스크. 체크박스 완료 후 Slack 자동 보고.*
<!-- /SCREENSHOT -->

## C.2 주간 체크리스트 (30분)

- [ ] R2 사용량/비용 추이 확인
- [ ] DB 디스크 사용률 80% 미만
- [ ] dependabot/renovate PR 머지
- [ ] 신규 시설 온보딩 잔여 작업 확인
- [ ] 포스트모템 액션 아이템 진척 확인

<!-- SCREENSHOT: app-c-step02-weekly-checklist -->
![주간 체크리스트 — 매주 금요일 16:00](../assets/screenshots/app-c-step02-weekly-checklist.png)
*그림 C-2. 금요일 마무리 30분 루틴. 주말 전에 잠재 사고를 0으로.*
<!-- /SCREENSHOT -->

## C.3 월간 체크리스트 (2시간)

- [ ] 월간 보고서 생성·발송 결과 검증 (도달률 95%+)
- [ ] 백업 무결성 sample 복원 테스트 (1건)
- [ ] 시크릿 회전 (분기 1회 강제, 그 외에는 ops 판단)
- [ ] WAF 룰·CSP 규칙 검토
- [ ] 운영 비용 리포트 작성 (R2/Resend/서버)

<!-- SCREENSHOT: app-c-step03-monthly-checklist -->
![월간 체크리스트 — 매월 1주차 화요일 14:00](../assets/screenshots/app-c-step03-monthly-checklist.png)
*그림 C-3. 1인 운영의 핵심 의식. 화요일을 택한 이유는 월요일 사고 처리 후 안정된 시점.*
<!-- /SCREENSHOT -->

## C.4 분기 체크리스트 (반나절)

- [ ] 시크릿 강제 회전 (모든 API 키)
- [ ] gpg 키 만료 30일 전 갱신
- [ ] 의존성 메이저 업그레이드 검토
- [ ] 부하 테스트 재실행 (k6)
- [ ] 어댑터 dry-run (Storage/Email)

## C.5 런북 템플릿

```markdown
# Runbook: <event-name>
## When this happens
- 트리거 조건 (예: backup-daily push 30분 미수신)

## Symptoms
- Kuma critical 알람 (URL: ...)

## Steps
1. SSH abada-65
2. docker compose logs cron-worker --tail=200
3. ... (5분 안에 끝나는 단계로)

## Rollback
- ...

## Postmortem
- 1페이지 보고서를 docs/incidents/ 에 작성
```

<!-- SCREENSHOT: app-c-step04-runbook-template -->
![런북 템플릿 — 한 페이지 한 사건](../assets/screenshots/app-c-step04-runbook-template.png)
*그림 C-4. docs/runbooks/ 디렉토리. 사고 5분 안에 펼치고 따라 칠 수 있는 형태.*
<!-- /SCREENSHOT -->

## 캡처 체크리스트

- [ ] `app-c-step01-daily-checklist.png`
- [ ] `app-c-step02-weekly-checklist.png`
- [ ] `app-c-step03-monthly-checklist.png`
- [ ] `app-c-step04-runbook-template.png`
