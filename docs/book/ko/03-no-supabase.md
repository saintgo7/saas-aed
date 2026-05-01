---
title: "3장. Supabase·Vercel을 배제한 이유"
slug: "no-supabase"
chapter: 3
words_target: 3500
screenshots:
  - ch03-step01-cost-comparison-table
  - ch03-step02-data-residency-map
  - ch03-step03-vendor-lock-in-diagram
  - ch03-step04-self-host-decision-tree
---

# 3장. Supabase·Vercel을 배제한 이유

## 학습 목표

- Supabase/Vercel의 강점과 본 SaaS 도메인의 불일치 지점을 식별한다
- 데이터 잔류성(data residency), 비용 곡선, 락인 위험을 정량적으로 비교한다
- "10,000대 스케일 시점의 월 청구액"을 두 시나리오로 추정한다
- 자체 호스팅 + Cloudflare Edge 라는 비주류 결정의 트레이드오프를 솔직히 적는다
- 이 결정이 다음 장 아키텍처 선택에 미치는 제약을 정리한다

## 핵심 개념

Supabase는 좋다. Vercel은 더 좋다. 그러나 본 SaaS는 두 가지 모두를 사용하지
않는다. 이유는 단 하나, **점검 데이터는 의료법상 국내 잔류가 권장되며, 5년치
서명 이미지가 외부 클라우드 비용 곡선에 끌려가서는 안 된다**는 점이다. 게다가
"BaaS 종속"은 곧 "벤더 가격 정책 종속"이고, 한 번 락인되면 마이그레이션 비용이
SaaS 자체보다 커지는 시점이 온다.

## 3.1 Supabase의 강점 — 우리가 포기한 것

- 인증·DB·Storage·Realtime을 5분에 붙일 수 있다
- RLS(Row Level Security)는 다기관 격리 패턴의 모범답안에 가깝다
- pgvector, edge functions, dashboard — 셋 다 강력하다

이 모든 것을 우리는 **포기**했다. 다음 절의 이유 때문에.

<!-- SCREENSHOT: ch03-step03-vendor-lock-in-diagram -->
![BaaS 락인 시각화 — 인증/DB/Storage/Function 4중 종속](../assets/screenshots/ch03-step03-vendor-lock-in-diagram.png)
*그림 3-1. BaaS 한 곳에 4가지 책임을 모두 위임할 때, 이전 비용은 4개 모듈을 동시에 옮겨야 하는 곱셈 비용이 된다.*
<!-- /SCREENSHOT -->

## 3.2 데이터 잔류성

「개인정보 보호법」과 의료법 가이드라인은 점검자 개인 정보 + 시설 위치 +
시설 사진을 가급적 국내 보관할 것을 권고한다. Supabase의 도쿄/싱가포르 리전은
"국내"가 아니다.

<!-- SCREENSHOT: ch03-step02-data-residency-map -->
![데이터 잔류 지도 — 점검 사진이 국경을 넘는 순간](../assets/screenshots/ch03-step02-data-residency-map.png)
*그림 3-2. 사용자 → 클라우드 리전 → 백업 위치의 3단계 흐름도. 한 단계라도 국경을 넘으면 별도 동의·고지 의무가 따라붙는다.*
<!-- /SCREENSHOT -->

<!-- TODO: 실제 법령 인용 + 보건복지부 가이드라인 발췌 -->

## 3.3 비용 곡선 — 10,000대 시나리오

100대 운영 시 Supabase Pro($25/월)면 충분하다. 그러나 본 SaaS의 미션은
10,000대 스케일이고, 그 시점이 되면 다음이 청구된다.

<!-- SCREENSHOT: ch03-step01-cost-comparison-table -->
![비용 비교표 — 100대 / 1,000대 / 10,000대 시나리오](../assets/screenshots/ch03-step01-cost-comparison-table.png)
*그림 3-3. Supabase Pro vs 자체 호스팅 + Cloudflare 비용 곡선. 1,000대 부근에서 교차하고, 10,000대에서 격차가 한 자릿수 이상 벌어진다.*
<!-- /SCREENSHOT -->

| 항목 | Supabase Pro | 자체 호스팅 + Cloudflare |
|---|---|---|
| 100대 | $25/월 | ~$15/월 (서버) |
| 1,000대 | $200~/월 | ~$30/월 |
| 10,000대 | $1,500~/월 | ~$80/월 |

<!-- TODO: 실제 R2 egress + Postgres 디스크 + 서버 사양 기반 정확 추정 -->

## 3.4 Vercel의 강점과 우리가 포기한 것

Vercel은 Next.js 의 모든 기능을 100% 끌어낸다. ISR·Edge Functions·Image
Optimization 모두 구성 한 줄이면 된다. 그럼에도 우리는 다음 이유로 자체
호스팅을 택했다.

- **WAF/Rate-Limit 규칙을 자체 nginx + Cloudflare WAF로 이중화**하고 싶다
- **DOCX/PDF 생성 시 50MB 메모리 + 5초 CPU 가 일상**이라, 서버리스 한도에
  부딪힌다
- **cron 잡 6종이 매일 안정적으로 돌아야** 하는데, Vercel Cron 의 단일 리전
  실행은 백업 잡과 잘 맞지 않는다

## 3.5 우리의 선택 — abada-65 + Cloudflare Edge

자체 서버 1대(`abada-65`) 위의 Docker Compose, 앞단에 Cloudflare Tunnel +
WAF, 객체 저장소만 R2 사용. 4장에서 자세히 다룬다.

<!-- SCREENSHOT: ch03-step04-self-host-decision-tree -->
![자체 호스팅 결정 트리 — 5개 질문으로 BaaS vs Self-host 결정](../assets/screenshots/ch03-step04-self-host-decision-tree.png)
*그림 3-4. (1) 데이터 잔류 의무? (2) 10K 스케일 5년 운영? (3) cron 6종? (4) DOCX 50MB? (5) 운영팀 1명 이상? — 모두 Yes 면 self-host 가 합리적이다.*
<!-- /SCREENSHOT -->

### 3.5.1 트레이드오프 — 정직한 비용

자체 호스팅의 실제 비용은 **저자의 시간**이다. 백업, 모니터링, 인증서, OS
업데이트 — 이 모든 것이 추가된다. 14, 15장에서 이 비용을 어떻게 분당 단위로
관리하는지 다룬다.

<!-- TODO: 1년 운영 후 실제 운영 시간 측정치 추가 -->

## 3.6 결정의 제약 — 다음 장에 미치는 영향

자체 호스팅을 택한 순간 다음이 강제된다.

- **인증을 직접 구현해야 한다** → Auth.js (7장)
- **RLS 가 없다** → Drizzle 쿼리 레벨 다기관 가드 (5, 6장)
- **백업 책임이 우리에게 있다** → gpg + R2 미러 (14장)
- **모니터링도 우리 책임** → Uptime Kuma (15장)

## 요약

- Supabase/Vercel은 훌륭하지만, 데이터 잔류·비용 곡선·락인 위험에서 본 SaaS와 맞지 않는다
- 10,000대 시점의 비용 격차는 한 자릿수 이상으로 벌어진다
- 자체 호스팅의 진짜 비용은 운영 시간이다 — 14, 15장에서 분당 단위로 관리한다
- 이 결정이 다음 장의 abada-65 + Cloudflare Edge 아키텍처를 낳는다

## 다음 장 미리보기

다음 장에서는 abada-65 서버 1대 + Docker Compose + Cloudflare Tunnel 의 전체
아키텍처 다이어그램을 그리고, 각 컨테이너의 책임을 명확히 한다.

## 캡처 체크리스트

- [ ] `ch03-step01-cost-comparison-table.png` — 비용 비교표 (스프레드시트 캡처)
- [ ] `ch03-step02-data-residency-map.png` — 데이터 잔류 지도
- [ ] `ch03-step03-vendor-lock-in-diagram.png` — 락인 다이어그램
- [ ] `ch03-step04-self-host-decision-tree.png` — 결정 트리 다이어그램
