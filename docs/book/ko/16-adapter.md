---
title: "16장. 어댑터 패턴으로 타사 이전 대비"
slug: "adapter"
chapter: 16
words_target: 3000
screenshots:
  - ch16-step01-adapter-interface-tree
  - ch16-step02-storage-adapter-r2
  - ch16-step03-storage-adapter-s3
  - ch16-step04-email-adapter-resend-vs-ses
  - ch16-step05-migration-dry-run
---

# 16장. 어댑터 패턴으로 타사 이전 대비

## 학습 목표

- Storage / Email / Auth 3개 영역에 어댑터 패턴을 적용한다
- 본 SaaS 코드 베이스에서 "Cloudflare R2" 같은 벤더 이름이 등장하는 곳을 4파일로 한정한다
- 타사 이전 시뮬레이션을 dry-run 으로 검증한다
- 어댑터의 3가지 안티패턴(누설, 과추상, 1:1 매핑)을 피한다
- 30분 이전 시나리오의 런북을 작성한다

## 핵심 개념

자체 호스팅을 택했지만, 우리는 "**언제든 옮길 수 있다**"는 자세를 유지한다.
그 핵심 도구가 어댑터 패턴이다. R2 가 사라져도, Resend 가 망해도, abada-65 가
넘어가도 — 4파일 수정이면 끝나는 구조를 만든다.

<!-- SCREENSHOT: ch16-step01-adapter-interface-tree -->
![어댑터 인터페이스 트리 — lib/adapters/](../assets/screenshots/ch16-step01-adapter-interface-tree.png)
*그림 16-1. lib/adapters/{storage,email,auth}/index.ts 만 외부에 노출. 구현체는 r2.ts, s3.ts, gcs.ts 등으로 분리.*
<!-- /SCREENSHOT -->

## 16.1 Storage 어댑터

```ts
export interface StorageAdapter {
  putObject(key: string, body: Buffer | Uint8Array, opts?): Promise<{ etag: string }>
  getSignedUrl(key: string, ttlSec: number): Promise<string>
  deleteObject(key: string): Promise<void>
}
```

<!-- SCREENSHOT: ch16-step02-storage-adapter-r2 -->
![R2 어댑터 구현 — S3 호환 SDK 사용](../assets/screenshots/ch16-step02-storage-adapter-r2.png)
*그림 16-2. r2.ts. R2 가 S3 호환이라 같은 SDK 로 endpoint 만 변경. 어댑터의 가치가 가장 빛나는 부분.*
<!-- /SCREENSHOT -->

<!-- SCREENSHOT: ch16-step03-storage-adapter-s3 -->
![S3 어댑터 구현 — 같은 인터페이스, 다른 endpoint](../assets/screenshots/ch16-step03-storage-adapter-s3.png)
*그림 16-3. s3.ts. R2 가 사라지면 환경변수 한 줄 변경으로 AWS S3 로 이전.*
<!-- /SCREENSHOT -->

## 16.2 Email 어댑터

```ts
export interface EmailAdapter {
  send(input: EmailInput): Promise<{ id: string }>
}
```

<!-- SCREENSHOT: ch16-step04-email-adapter-resend-vs-ses -->
![Email 어댑터 — Resend vs SES side-by-side](../assets/screenshots/ch16-step04-email-adapter-resend-vs-ses.png)
*그림 16-4. resend.ts (좌) 와 ses.ts (우). 첨부 처리·반송 처리 외에는 거의 동일.*
<!-- /SCREENSHOT -->

## 16.3 Auth 어댑터

Auth.js 가 이미 어댑터 패턴이라 우리는 DrizzleAdapter 한 군데만 바꾸면 된다.

## 16.4 안티패턴 3가지

| 안티패턴 | 회피 |
|---|---|
| **누설** (Storage 인터페이스에 R2 전용 옵션) | 옵션은 string-keyed `extras` 로 일반화 |
| **과추상** (모든 SDK 메서드 1:1 미러링) | 우리가 실제로 쓰는 4-5개만 노출 |
| **1:1 매핑** (얇은 wrapper) | 우리 도메인 단어로 다시 명명 (putObject vs uploadFile) |

## 16.5 30분 이전 런북

```bash
# Storage: R2 → S3
1. AWS S3 버킷 생성 (5분)
2. rclone copy r2:* s3:* (트래픽 양에 따라 가변)
3. .env.production: STORAGE_PROVIDER=s3 + STORAGE_ENDPOINT 변경
4. docker compose up -d --no-deps app cron-worker
5. /healthz 통과 검증

# Email: Resend → AWS SES
1. SES 도메인 검증 (24~48시간 — 사전 작업)
2. .env.production: EMAIL_PROVIDER=ses
3. compose 재시작
```

<!-- SCREENSHOT: ch16-step05-migration-dry-run -->
![이전 dry-run 결과 — 통합 테스트 슈트가 새 어댑터로 통과](../assets/screenshots/ch16-step05-migration-dry-run.png)
*그림 16-5. CI 매트릭스 — Storage R2/S3/MinIO, Email Resend/SES 4조합 모두 같은 통합 테스트 통과.*
<!-- /SCREENSHOT -->

## 16.6 우리 어댑터의 한계

DOCX/PDF 생성은 어댑터화하지 않았다. 외부 서비스를 쓰지 않기 때문. cron-worker
도 마찬가지. "**현재 사용 중인 외부 의존성 + 가까운 미래의 후보**" 만 어댑터화
한다. 미래의 모든 가능성을 추상화하지 않는다.

## 요약

- 3개 영역(Storage·Email·Auth)에만 어댑터, 나머지는 그대로
- 벤더 이름이 등장하는 곳을 4파일로 한정 — 락인 0
- 안티패턴 3가지(누설·과추상·1:1)을 의식적으로 피함
- 30분 이전 런북을 갖되, 매월 dry-run 으로 살아 있는지 확인

## 다음 장 미리보기

다음 장에서는 1,000대 → 10,000대 스케일 시 무엇이 깨지는지, 그리고 그 깨짐을
미리 막는 4개 결정 포인트를 다룬다.

## 캡처 체크리스트

- [ ] `ch16-step01-adapter-interface-tree.png`
- [ ] `ch16-step02-storage-adapter-r2.png`
- [ ] `ch16-step03-storage-adapter-s3.png`
- [ ] `ch16-step04-email-adapter-resend-vs-ses.png`
- [ ] `ch16-step05-migration-dry-run.png`
