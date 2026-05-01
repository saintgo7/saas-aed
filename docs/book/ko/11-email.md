---
title: "11장. Resend + React Email 첨부"
slug: "email"
chapter: 11
words_target: 3000
screenshots:
  - ch11-step01-react-email-component
  - ch11-step02-resend-api-call
  - ch11-step03-email-deliverability-dashboard
  - ch11-step04-spf-dkim-dmarc-records
  - ch11-step05-bounce-handling-log
---

# 11장. Resend + React Email 첨부

## 학습 목표

- React Email 로 보고서 발송 메일을 컴포넌트화한다
- Resend API 로 DOCX/PDF 첨부 메일을 5MB 이하로 안정 발송한다
- SPF/DKIM/DMARC 3종을 설정해 도달성을 95%+ 로 유지한다
- 반송(bounce) 처리와 자동 재시도 패턴을 구현한다
- 매직링크 메일과 보고서 메일의 운영 차이를 정리한다

## 핵심 개념

이메일은 본 SaaS의 가장 외부적인 의존성이다. 우리가 아무리 잘 만들어도 받는
쪽 메일 서버의 스팸 필터가 한 번 우리를 의심하면 끝이다. 그래서 핵심은 코드가
아니라 **DNS 레코드 3종 + Resend 평판 관리**다.

## 11.1 React Email 컴포넌트

```tsx
export function MonthlyReportEmail({ tenant, period, downloadUrl }) {
  return (
    <Html>
      <Head />
      <Preview>{tenant.name} {period} 월간 점검 보고서</Preview>
      <Body>
        <Container>
          <Heading>{tenant.name} {period} 보고서</Heading>
          <Text>첨부 파일 또는 아래 링크에서 확인하세요.</Text>
          <Link href={downloadUrl}>{downloadUrl}</Link>
        </Container>
      </Body>
    </Html>
  )
}
```

<!-- SCREENSHOT: ch11-step01-react-email-component -->
![React Email 미리보기 — pnpm email dev 결과](../assets/screenshots/ch11-step01-react-email-component.png)
*그림 11-1. `pnpm email dev` 의 라이브 프리뷰. Gmail/Outlook/iOS 클라이언트별 렌더링 차이를 한 화면에 본다.*
<!-- /SCREENSHOT -->

## 11.2 Resend API

```ts
await resend.emails.send({
  from: "AED 점검 <reports@aed.example.kr>",
  to: tenant.adminEmail,
  subject: `${tenant.name} ${period} 월간 점검 보고서`,
  react: <MonthlyReportEmail {...} />,
  attachments: [
    { filename: `${slug}-${yyyymm}.docx`, content: docxBuffer },
    { filename: `${slug}-${yyyymm}.pdf`, content: pdfBuffer },
  ],
})
```

<!-- SCREENSHOT: ch11-step02-resend-api-call -->
![Resend API 호출 결과 — id 와 status](../assets/screenshots/ch11-step02-resend-api-call.png)
*그림 11-2. Resend 응답 JSON. id 를 audit_logs 에 박아 두면 사후에 도달 여부를 추적 가능.*
<!-- /SCREENSHOT -->

### 11.2.1 첨부 5MB 한도

DOCX + PDF 합이 5MB 를 넘으면 메일 본문에 R2 다운로드 링크만 박는다. 자동 분기.

## 11.3 도달성 — SPF/DKIM/DMARC

| 레코드 | 역할 |
|---|---|
| SPF | 우리 도메인의 발송 권한 IP 명시 |
| DKIM | 메시지 서명 무결성 |
| DMARC | SPF/DKIM 실패 시 정책 (quarantine/reject) |

<!-- SCREENSHOT: ch11-step04-spf-dkim-dmarc-records -->
![Cloudflare DNS — SPF/DKIM/DMARC 3종 레코드](../assets/screenshots/ch11-step04-spf-dkim-dmarc-records.png)
*그림 11-3. Cloudflare DNS 패널. include:spf.resend.com, resend._domainkey, _dmarc 세 레코드가 핵심.*
<!-- /SCREENSHOT -->

## 11.4 도달성 대시보드

<!-- SCREENSHOT: ch11-step03-email-deliverability-dashboard -->
![Resend 대시보드 — 발송/도달/반송/스팸 비율](../assets/screenshots/ch11-step03-email-deliverability-dashboard.png)
*그림 11-4. 30일치 통계. 도달률 95%+ 유지가 운영 KPI.*
<!-- /SCREENSHOT -->

## 11.5 반송 처리

```ts
// app/api/webhooks/resend/route.ts
case "email.bounced": {
  await markEmailBlocked(payload.email)
  await notifyAdmin(...)
}
```

<!-- SCREENSHOT: ch11-step05-bounce-handling-log -->
![반송 로그 — 오타 이메일 자동 차단](../assets/screenshots/ch11-step05-bounce-handling-log.png)
*그림 11-5. audit_logs 의 email.bounce 행. 동일 주소 3회 반송 시 자동 차단 + 관리자 알림.*
<!-- /SCREENSHOT -->

## 11.6 매직링크 vs 보고서 — 운영 차이

| 항목 | 매직링크 | 보고서 |
|---|---|---|
| 빈도 | 점검자 매 로그인 | 월 1회 |
| 첨부 | 없음 | 5~20MB |
| 도달 실패 비용 | 매우 큼 (로그인 차단) | 큼 (재발송 가능) |
| 도메인 분리 | `auth@` | `reports@` 권장 |

도메인 분리는 한 종류의 사고가 다른 종류를 죽이지 않게 하는 보호선.

## 요약

- 코드보다 DNS 가 도달성의 80% 결정 — SPF/DKIM/DMARC 는 협상 불가
- React Email 컴포넌트화로 클라이언트 호환성 자동 보장
- 5MB 첨부 한계는 R2 다운로드 링크로 자동 분기
- 매직링크와 보고서는 다른 발송 도메인을 쓰는 것이 운영적으로 현명

## 다음 장 미리보기

다음 장에서는 cron-worker 의 6종 잡 — 일정 생성, 알림, 백업, 보고서, 청소,
재시도 — 가 어떻게 한 컨테이너 안에서 안정적으로 돌아가는지 다룬다.

## 캡처 체크리스트

- [ ] `ch11-step01-react-email-component.png`
- [ ] `ch11-step02-resend-api-call.png`
- [ ] `ch11-step03-email-deliverability-dashboard.png`
- [ ] `ch11-step04-spf-dkim-dmarc-records.png`
- [ ] `ch11-step05-bounce-handling-log.png`
