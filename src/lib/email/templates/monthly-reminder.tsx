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

export interface MonthlyReminderEmailProps {
  readonly inspectorName: string
  readonly yearMonth: string
  readonly deviceCount: number
  readonly dashboardUrl: string
}

export function MonthlyReminderEmail(props: MonthlyReminderEmailProps) {
  const { inspectorName, yearMonth, deviceCount, dashboardUrl } = props

  return (
    <Html lang="ko">
      <Head />
      <Preview>
        {yearMonth} 자동심장충격기 자가 점검 안내 — {deviceCount}대 점검 대상
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
              {yearMonth} 정기 점검 안내
            </Heading>
            <Text style={{ color: TEXT_SECONDARY, fontSize: 14, margin: "0 0 24px" }}>
              {inspectorName} 점검자님, 이번 달 점검을 시작해 주세요.
            </Text>

            <Hr style={{ borderColor: BORDER, margin: "0 0 20px" }} />

            <Text style={{ color: TEXT_PRIMARY, fontSize: 15, margin: "0 0 12px" }}>
              담당하신 자동심장충격기 <strong>{deviceCount}대</strong>의 월간 자가 점검이 시작되었습니다.
              관련 법령에 따라 매월 1회 12개 점검 항목을 확인하고 결과서를 보관해야 합니다.
            </Text>

            <Text style={{ color: TEXT_PRIMARY, fontSize: 15, margin: "0 0 24px" }}>
              점검은 5분 이내로 끝납니다. 모바일에서도 동일한 화면으로 진행할 수 있습니다.
            </Text>

            <Section style={{ textAlign: "center", margin: "24px 0 8px" }}>
              <Button
                href={dashboardUrl}
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
                지금 점검 시작
              </Button>
            </Section>

            <Hr style={{ borderColor: BORDER, margin: "24px 0 16px" }} />

            <Text style={{ color: TEXT_SECONDARY, fontSize: 12, margin: 0 }}>
              미점검 시 매월 말 관리자에게 별도 안내가 발송됩니다.
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

export default MonthlyReminderEmail
