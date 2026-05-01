---
title: "Chapter 11. Resend + React Email Attachments"
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

# Chapter 11. Resend + React Email Attachments

## Learning Objectives

- Componentize report-delivery emails with React Email
- Send DOCX/PDF attachments under 5MB reliably via the Resend API
- Hold deliverability above 95% by configuring SPF/DKIM/DMARC
- Handle bounces and retries automatically
- Distinguish operational concerns of magic-link emails versus report emails

## The Big Picture

Email is the SaaS's most external dependency. No matter how well we build,
once a recipient mail server suspects us we are done. The crux is not code
but **DNS records and Resend reputation**.

## 11.1 React Email Component

```tsx
export function MonthlyReportEmail({ tenant, period, downloadUrl }) {
  return (
    <Html>
      <Head />
      <Preview>{tenant.name} {period} monthly inspection report</Preview>
      <Body>
        <Container>
          <Heading>{tenant.name} {period} report</Heading>
          <Text>See the attachment or follow the link below.</Text>
          <Link href={downloadUrl}>{downloadUrl}</Link>
        </Container>
      </Body>
    </Html>
  )
}
```

<!-- SCREENSHOT: ch11-step01-react-email-component -->
![React Email preview — pnpm email dev](../assets/screenshots/ch11-step01-react-email-component.png)
*Figure 11-1. Live preview from `pnpm email dev`. We can see Gmail/Outlook/iOS rendering side by side.*
<!-- /SCREENSHOT -->

## 11.2 Resend API

```ts
await resend.emails.send({
  from: "AED Inspection <reports@aed.example.kr>",
  to: tenant.adminEmail,
  subject: `${tenant.name} ${period} monthly inspection report`,
  react: <MonthlyReportEmail {...} />,
  attachments: [
    { filename: `${slug}-${yyyymm}.docx`, content: docxBuffer },
    { filename: `${slug}-${yyyymm}.pdf`, content: pdfBuffer },
  ],
})
```

<!-- SCREENSHOT: ch11-step02-resend-api-call -->
![Resend API response — id and status](../assets/screenshots/ch11-step02-resend-api-call.png)
*Figure 11-2. The Resend response JSON. Storing `id` in audit_logs lets us trace delivery later.*
<!-- /SCREENSHOT -->

### 11.2.1 The 5MB Attachment Limit

When DOCX + PDF together exceed 5MB, we drop the attachments and embed an
R2 download link in the body instead. Automatic.

## 11.3 Deliverability — SPF/DKIM/DMARC

| Record | Role |
|---|---|
| SPF | Authorized senders for our domain |
| DKIM | Message signature integrity |
| DMARC | Policy when SPF/DKIM fails (quarantine/reject) |

<!-- SCREENSHOT: ch11-step04-spf-dkim-dmarc-records -->
![Cloudflare DNS — SPF, DKIM, and DMARC records](../assets/screenshots/ch11-step04-spf-dkim-dmarc-records.png)
*Figure 11-3. Cloudflare DNS panel. include:spf.resend.com, resend._domainkey, _dmarc — three records cover the essentials.*
<!-- /SCREENSHOT -->

## 11.4 Deliverability Dashboard

<!-- SCREENSHOT: ch11-step03-email-deliverability-dashboard -->
![Resend dashboard — sent / delivered / bounced / spam](../assets/screenshots/ch11-step03-email-deliverability-dashboard.png)
*Figure 11-4. 30-day stats. Holding delivered above 95% is the operating KPI.*
<!-- /SCREENSHOT -->

## 11.5 Bounce Handling

```ts
// app/api/webhooks/resend/route.ts
case "email.bounced": {
  await markEmailBlocked(payload.email)
  await notifyAdmin(...)
}
```

<!-- SCREENSHOT: ch11-step05-bounce-handling-log -->
![Bounce log — typo emails auto-blocked](../assets/screenshots/ch11-step05-bounce-handling-log.png)
*Figure 11-5. An audit_logs row of `email.bounce`. Three bounces from the same address triggers an auto-block plus admin notification.*
<!-- /SCREENSHOT -->

## 11.6 Magic Link vs Report — Operational Differences

| Aspect | Magic link | Report |
|---|---|---|
| Frequency | Per inspector login | Once a month |
| Attachment | None | 5–20MB |
| Cost of failure | High (login blocked) | Moderate (resend possible) |
| Domain split | `auth@` | `reports@` recommended |

Splitting domains is a firewall: a problem with one type of mail does not
kill the other.

## Summary

- DNS, not code, decides 80% of deliverability — SPF/DKIM/DMARC are non-negotiable
- React Email components ensure cross-client compatibility automatically
- The 5MB attachment limit triggers an automatic switch to an R2 download link
- Splitting auth and report domains is operationally wise

## Next Chapter

Next we cover the cron-worker's six jobs — schedule, notify, backup,
report, cleanup, retry — and how they coexist reliably in one container.

## Capture Checklist

- [ ] `ch11-step01-react-email-component.png`
- [ ] `ch11-step02-resend-api-call.png`
- [ ] `ch11-step03-email-deliverability-dashboard.png`
- [ ] `ch11-step04-spf-dkim-dmarc-records.png`
- [ ] `ch11-step05-bounce-handling-log.png`
