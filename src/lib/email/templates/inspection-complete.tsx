import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text
} from "@react-email/components"

const BRAND_700 = "#1D4ED8"
const TEXT_PRIMARY = "#0F172A"
const TEXT_SECONDARY = "#475569"
const BORDER = "#E2E8F0"
const BACKGROUND = "#F8FAFC"

export interface InspectionCompleteEmailProps {
  readonly inspectorName: string
  readonly yearMonth: string
  // device: provide either deviceLabel OR (deviceLocation + deviceSerial)
  readonly deviceLabel?: string
  readonly deviceLocation?: string
  readonly deviceSerial?: string
  // organization (optional, prepended to email body)
  readonly organizationName?: string
  // result summary
  readonly ngCount?: number
  readonly signedAt?: Date
  // download links: pass downloadUrl (single) OR docxUrl + pdfUrl
  readonly downloadUrl?: string
  readonly docxUrl?: string
  readonly pdfUrl?: string
}

function formatSignedAt(d: Date): string {
  // ko-KR fixed format to avoid locale runtime quirks in worker contexts.
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

export function InspectionCompleteEmail(props: InspectionCompleteEmailProps) {
  const { inspectorName, yearMonth, organizationName, ngCount = 0, signedAt = new Date() } = props
  const deviceLabel =
    props.deviceLabel ??
    [props.deviceLocation, props.deviceSerial && `S/N ${props.deviceSerial}`]
      .filter(Boolean)
      .join(" · ") ??
    "장비"
  const downloadUrl = props.downloadUrl ?? props.pdfUrl ?? props.docxUrl ?? "#"
  const ngLine =
    ngCount === 0
      ? "전 항목 정상(OK)으로 점검되었습니다."
      : `점검 결과 ${ngCount}건의 부적합(NG) 항목이 확인되었습니다.`

  return (
    <Html lang="ko">
      <Head />
      <Preview>
        {yearMonth} {deviceLabel} 자동심장충격기 자가 점검이 완료되었습니다.
      </Preview>
      <Body style={{ backgroundColor: BACKGROUND, fontFamily: "Pretendard, system-ui, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
          <Section
            style={{
              backgroundColor: "#FFFFFF",
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: 32
            }}
          >
            <Heading style={{ color: BRAND_700, fontSize: 22, margin: "0 0 8px" }}>
              자가 점검 완료 안내
            </Heading>
            <Text style={{ color: TEXT_SECONDARY, fontSize: 14, margin: "0 0 24px" }}>
              {yearMonth} 정기 점검이 정상적으로 기록되었습니다.
            </Text>

            <Hr style={{ borderColor: BORDER, margin: "0 0 20px" }} />

            <Text style={{ color: TEXT_PRIMARY, fontSize: 15, margin: "0 0 12px" }}>
              <strong>점검자</strong> · {inspectorName}
            </Text>
            <Text style={{ color: TEXT_PRIMARY, fontSize: 15, margin: "0 0 12px" }}>
              <strong>대상 기기</strong> · {deviceLabel}
            </Text>
            <Text style={{ color: TEXT_PRIMARY, fontSize: 15, margin: "0 0 12px" }}>
              <strong>점검 월</strong> · {yearMonth}
            </Text>
            <Text style={{ color: TEXT_PRIMARY, fontSize: 15, margin: "0 0 12px" }}>
              <strong>서명 일시</strong> · {formatSignedAt(signedAt)}
            </Text>
            <Text style={{ color: TEXT_PRIMARY, fontSize: 15, margin: "0 0 24px" }}>
              <strong>점검 결과</strong> · {ngLine}
            </Text>

            <Section style={{ textAlign: "center", margin: "24px 0 8px" }}>
              <Button
                href={downloadUrl}
                style={{
                  backgroundColor: BRAND_700,
                  color: "#FFFFFF",
                  padding: "12px 24px",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none"
                }}
              >
                점검 결과서 다운로드
              </Button>
            </Section>

            <Hr style={{ borderColor: BORDER, margin: "24px 0 16px" }} />

            <Text style={{ color: TEXT_SECONDARY, fontSize: 12, margin: 0 }}>
              본 메일은 자동심장충격기(AED) 의무 자가 점검 기록을 위해 발송됩니다.
              결과서에는 전자서명과 SHA-256 해시가 포함되어 위·변조를 방지합니다.
            </Text>
          </Section>

          <Text style={{ color: TEXT_SECONDARY, fontSize: 12, textAlign: "center", marginTop: 16 }}>
            AED Inspection Manager · 본 메일은 발신 전용입니다.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InspectionCompleteEmail
