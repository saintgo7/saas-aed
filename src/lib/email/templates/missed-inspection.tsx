import {
  Body,
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
const DANGER_700 = "#B91C1C"
const TEXT_PRIMARY = "#0F172A"
const TEXT_SECONDARY = "#475569"
const BORDER = "#E2E8F0"
const ROW_BORDER = "#EEF2F7"
const BACKGROUND = "#F8FAFC"

export interface MissedInspectionDevice {
  readonly label: string
  readonly inspector: string
}

export interface MissedInspectionEmailProps {
  readonly adminName?: string
  readonly yearMonth: string
  readonly missedDevices?: readonly MissedInspectionDevice[]
  readonly organizationName?: string
  readonly userName?: string
  readonly devices?: readonly { location: string; serial: string; model: string }[]
}

export function MissedInspectionEmail(props: MissedInspectionEmailProps) {
  const { adminName, yearMonth, missedDevices = [] } = props

  return (
    <Html lang="ko">
      <Head />
      <Preview>
        {yearMonth} 미점검 자동심장충격기 {String(missedDevices.length)}대 안내
      </Preview>
      <Body style={{ backgroundColor: BACKGROUND, fontFamily: "Pretendard, system-ui, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px" }}>
          <Section
            style={{
              backgroundColor: "#FFFFFF",
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: 32
            }}
          >
            <Heading style={{ color: DANGER_700, fontSize: 22, margin: "0 0 8px" }}>
              {yearMonth} 미점검 기기 알림
            </Heading>
            <Text style={{ color: TEXT_SECONDARY, fontSize: 14, margin: "0 0 24px" }}>
              {adminName} 관리자님, 이번 달 점검이 누락된 기기 목록입니다.
            </Text>

            <Hr style={{ borderColor: BORDER, margin: "0 0 20px" }} />

            <Text style={{ color: TEXT_PRIMARY, fontSize: 15, margin: "0 0 16px" }}>
              총 <strong style={{ color: DANGER_700 }}>{missedDevices.length}대</strong>의 자동심장충격기가
              {yearMonth} 자가 점검을 완료하지 않았습니다. 관련 담당자에게 확인을 요청하시거나,
              관리자 화면에서 직접 점검을 등록해 주세요.
            </Text>

            <Section style={{ marginTop: 16 }}>
              <Text
                style={{
                  color: TEXT_SECONDARY,
                  fontSize: 12,
                  margin: "0 0 4px",
                  textTransform: "uppercase",
                  letterSpacing: 0.5
                }}
              >
                미점검 기기 목록
              </Text>
              <Section style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px" }}>
                {missedDevices.map((d, idx) => (
                  <Section
                    key={`${d.label}-${idx}`}
                    style={{
                      borderBottom: idx === missedDevices.length - 1 ? "none" : `1px solid ${ROW_BORDER}`,
                      padding: "10px 0"
                    }}
                  >
                    <Text style={{ color: TEXT_PRIMARY, fontSize: 14, margin: 0 }}>
                      <strong>{d.label}</strong>
                    </Text>
                    <Text style={{ color: TEXT_SECONDARY, fontSize: 13, margin: "2px 0 0" }}>
                      담당 점검자 · {d.inspector}
                    </Text>
                  </Section>
                ))}
              </Section>
            </Section>

            <Hr style={{ borderColor: BORDER, margin: "24px 0 16px" }} />

            <Text style={{ color: TEXT_SECONDARY, fontSize: 12, margin: 0 }}>
              미점검 상태가 누적되면 관할 보건소 보고 의무가 발생할 수 있습니다.
              이번 달 내 점검 완료를 권장드립니다.
            </Text>
          </Section>

          <Text style={{ color: BRAND_700, fontSize: 12, textAlign: "center", marginTop: 16 }}>
            AED Inspection Manager · 본 메일은 발신 전용입니다.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MissedInspectionEmail
