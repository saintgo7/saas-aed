---
title: "9장. 전자서명 캔버스, SHA-256, R2"
slug: "signature"
chapter: 9
words_target: 4000
screenshots:
  - ch09-step01-signature-canvas-blank
  - ch09-step02-signature-stroke-data
  - ch09-step03-sha256-hash-output
  - ch09-step04-r2-upload-success
  - ch09-step05-signature-verify-replay
  - ch09-step06-audit-log-row
---

# 9장. 전자서명 캔버스, SHA-256, R2

## 학습 목표

- HTML Canvas 로 모바일 친화 서명 패드를 구현한다
- 서명 데이터를 SVG path + PNG 두 형식으로 저장하고 SHA-256 해시를 박는다
- Cloudflare R2 에 presigned URL 로 직접 업로드하여 서버 부하를 줄인다
- 사후 감사 시 "이 서명이 그 시점의 서명"임을 재현(replay)으로 증명한다
- 서명 위변조 시도 5종을 테스트로 차단한다

## 핵심 개념

전자서명은 본 SaaS 의 "법적 증거"이다. 종이 서명을 흉내 내는 것이 아니라
**종이 서명보다 강한 무결성**을 만드는 것이 목표다. 그 핵심은 세 가지 — 캔버스
스트로크 원본 보존, SHA-256 체인, R2 객체 키에 시각 박기.

<!-- SCREENSHOT: ch09-step01-signature-canvas-blank -->
![서명 캔버스 — 빈 상태와 가이드 라인](../assets/screenshots/ch09-step01-signature-canvas-blank.png)
*그림 9-1. 모바일에서 본 서명 캔버스. 회색 가이드 라인이 종이 점검표와 같은 위치 감각을 준다.*
<!-- /SCREENSHOT -->

## 9.1 캔버스 스트로크 캡처

```ts
// 핵심: 마우스/터치 이벤트를 (x, y, t, pressure) 시퀀스로 저장
type Stroke = { x: number; y: number; t: number; p?: number }
```

<!-- SCREENSHOT: ch09-step02-signature-stroke-data -->
![DevTools — 스트로크 시퀀스 JSON](../assets/screenshots/ch09-step02-signature-stroke-data.png)
*그림 9-2. 서명 1회의 raw 스트로크. 이 시퀀스를 그대로 저장하면 사후 재현(replay)도 가능.*
<!-- /SCREENSHOT -->

### 9.1.1 SVG + PNG 두 형식

- **SVG**: 벡터, DOCX/PDF 임베드 시 깨짐 없음
- **PNG**: 미리보기·검색 인덱싱·외부 도구 호환

## 9.2 SHA-256 해시 체인

```ts
const sigBlob = new Blob([svg])
const digest = await crypto.subtle.digest("SHA-256", await sigBlob.arrayBuffer())
const hashHex = bufferToHex(digest)
```

<!-- SCREENSHOT: ch09-step03-sha256-hash-output -->
![서명 SHA-256 해시 출력 — 한 글자만 바뀌어도 해시 전체가 달라진다](../assets/screenshots/ch09-step03-sha256-hash-output.png)
*그림 9-3. 같은 서명을 두 번 해도 픽셀 1개 차이로 해시가 완전히 달라진다 — 이것이 위변조 검출의 출발점.*
<!-- /SCREENSHOT -->

### 9.2.1 체인

`signatures.previousHash = 직전 서명 해시` 를 둬서 하나가 바뀌면 이후 모두가
깨지는 사슬을 만든다. (참고: SAP 프로젝트의 Tier 1 MVP 패턴)

## 9.3 R2 직접 업로드 (presigned)

서버는 객체를 받지 않고 **presigned URL** 만 발급한다. 클라이언트가 직접 R2 로
PUT.

```ts
// app/api/r2/presign/route.ts
const url = await s3Client.getSignedUrl(
  new PutObjectCommand({ Bucket, Key: `sig/${tenantId}/${id}.svg`, ... }),
  { expiresIn: 60 }
)
return Response.json({ url })
```

<!-- SCREENSHOT: ch09-step04-r2-upload-success -->
![R2 직접 업로드 — Network 탭에서 본 PUT 200](../assets/screenshots/ch09-step04-r2-upload-success.png)
*그림 9-4. Chrome DevTools Network. PUT https://...r2.cloudflarestorage.com/... 200, 서버는 60초 짜리 presigned URL 만 발급했다.*
<!-- /SCREENSHOT -->

### 9.3.1 키 네이밍

```
sig/{tenantId}/{inspectionId}/{timestamp}.svg
sig/{tenantId}/{inspectionId}/{timestamp}.png
```

타임스탬프가 키 안에 박혀 있어 "서명 후 덮어쓰기 사고" 자체가 구조적으로 차단된다.

## 9.4 사후 감사 — 서명 재현

<!-- SCREENSHOT: ch09-step05-signature-verify-replay -->
![서명 재현 — 스트로크 시퀀스를 0.5x 속도로 재생](../assets/screenshots/ch09-step05-signature-verify-replay.png)
*그림 9-5. 감사 화면에서 서명을 0.5배속 재생. 압력·속도·각도가 그 사람의 평소 서명과 일치하는지 시각 검증.*
<!-- /SCREENSHOT -->

## 9.5 위변조 시도 5종 차단

| 시도 | 차단 |
|---|---|
| 캡처 후 다른 점검에 재사용 | hash 가 inspectionId 와 함께 테이블에 박힘 |
| 서명 SVG 직접 편집 | hash 재계산 시 불일치 |
| R2 객체 덮어쓰기 | 키에 timestamp 포함, 버전 lock |
| DB tenant_id 위조 | 5장 3계층 가드 |
| 시계 조작 | 서버 시간 + cloudflared edge 타임스탬프 이중 기록 |

<!-- SCREENSHOT: ch09-step06-audit-log-row -->
![audit_logs — 서명 생성/검증/조회 이력](../assets/screenshots/ch09-step06-audit-log-row.png)
*그림 9-6. audit_logs 테이블의 한 행. signature.create 이벤트에 inspector_id, ip, ua, hash, replay_token 이 같이 들어간다.*
<!-- /SCREENSHOT -->

## 요약

- 전자서명의 목표는 "종이 흉내"가 아니라 "종이를 능가하는 무결성"
- SVG+PNG 이중 저장, SHA-256 체인, R2 키 타임스탬프가 무결성 3축
- presigned URL 직접 업로드로 서버 메모리·CPU 부담을 0 에 가깝게
- 5종 위변조 시도를 모두 구조적으로 차단

## 다음 장 미리보기

다음 장에서는 점검 결과로부터 DOCX/PDF 보고서를 어떻게 동시에 생성하고, 시설은
PDF, 보건소는 DOCX 라는 두 요구를 한 번에 만족시키는지 다룬다.

## 캡처 체크리스트

- [ ] `ch09-step01-signature-canvas-blank.png`
- [ ] `ch09-step02-signature-stroke-data.png`
- [ ] `ch09-step03-sha256-hash-output.png`
- [ ] `ch09-step04-r2-upload-success.png`
- [ ] `ch09-step05-signature-verify-replay.png`
- [ ] `ch09-step06-audit-log-row.png`
