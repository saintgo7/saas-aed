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
const DANGER_BORDER = "#DC2626"
const DANGER_BG = "#FEF2F2"
const WARN_BORDER = "#D97706"
const WARN_BG = "#FFFBEB"
const TEXT_PRIMARY = "#0F172A"
const TEXT_SECONDARY = "#475569"
const ROW_BORDER = "#EEF2F7"
const BACKGROUND = "#F8FAFC"

export type PadExpirySeverity =
  | "D-90" | "D-30" | "D-7"
  | "D90"  | "D30"  | "D7"

function normalizeSeverity(s: PadExpirySeverity): "D-90" | "D-30" | "D-7" {
  if (s === "D90" || s === "D-90") return "D-90"
  if (s === "D30" || s === "D-30") return "D-30"
  return "D-7"
}

export interface PadExpiryDevice {
  readonly label: string
  readonly daysLeft: number
  readonly replaceAt: Date
}

// Aggregated form (preferred) — one email per admin with all devices.
export interface PadExpiryEmailPropsAggregated {
  readonly adminName: string
  readonly devices: readonly PadExpiryDevice[]
  readonly severity: PadExpirySeverity
  readonly subjectKind?: "PAD" | "DEVICE"
}

// Single-device form — used by cron handlers that send one email per device.
export interface PadExpiryEmailPropsSingle {
  readonly userName: string
  readonly deviceLocation: string
  readonly deviceSerial: string
  readonly padReplaceAt: Date
  readonly severity: PadExpirySeverity
  readonly subjectKind?: "PAD" | "DEVICE"
}

export type PadExpiryEmailProps =
  | PadExpiryEmailPropsAggregated
  | PadExpiryEmailPropsSingle

function isSingle(p: PadExpiryEmailProps): p is PadExpiryEmailPropsSingle {
  return "deviceLocation" in p
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.max(0, Math.round(ms / 86_400_000))
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function PadExpiryEmail(props: PadExpiryEmailProps) {
  const severity = normalizeSeverity(props.severity)
  const subjectKind = props.subjectKind ?? "PAD"
  const adminName = isSingle(props) ? props.userName : props.adminName
  const devices: readonly PadExpiryDevice[] = isSingle(props)
    ? [
        {
          label: `${props.deviceLocation} (S/N ${props.deviceSerial})`,
          daysLeft: daysBetween(new Date(), props.padReplaceAt),
          replaceAt: props.padReplaceAt
        }
      ]
    : props.devices

  const isCritical = severity === "D-7"
  const isDeviceExpiry = subjectKind === "DEVICE"
  const accentBorder = isCritical ? DANGER_BORDER : WARN_BORDER
  const accentBg = isCritical ? DANGER_BG : WARN_BG

  const subject = isDeviceExpiry ? "본체" : "패드"
  const window = severity === "D-7" ? "7일" : severity === "D-30" ? "30일" : "90일"
  const heading = `${subject} 교체 ${isCritical ? "임박" : "예정"} (${window} 이내)`

  return (
    <Html lang="ko">
      <Head />
      <Preview>
        {heading} — 자동심장충격기 패드 교체 안내 ({String(devices.length)}대)
      </Preview>
      <Body style={{ backgroundColor: BACKGROUND, fontFamily: "Pretendard, system-ui, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px" }}>
          <Section
            style={{
              backgroundColor: "#FFFFFF",
              border: `2px solid ${accentBorder}`,
              borderRadius: 12,
              padding: 32
            }}
          >
            <Heading style={{ color: accentBorder, fontSize: 22, margin: "0 0 8px" }}>
              {heading}
            </Heading>
            <Text style={{ color: TEXT_SECONDARY, fontSize: 14, margin: "0 0 24px" }}>
              {adminName} 관리자님, 패드 교체가 임박한 자동심장충격기 목록입니다.
            </Text>

            <Section
              style={{
                backgroundColor: accentBg,
                border: `1px solid ${accentBorder}`,
                borderRadius: 8,
                padding: "12px 16px",
                margin: "0 0 20px"
              }}
            >
              <Text style={{ color: accentBorder, fontSize: 14, fontWeight: 600, margin: 0 }}>
                {isCritical
                  ? "교체 시한이 7일 이내입니다. 즉시 교체 일정을 확정해 주세요."
                  : "30일 이내 교체가 필요합니다. 발주·교체 일정을 미리 준비해 주세요."}
              </Text>
            </Section>

            <Hr style={{ borderColor: ROW_BORDER, margin: "0 0 16px" }} />

            <Text
              style={{
                color: TEXT_SECONDARY,
                fontSize: 12,
                margin: "0 0 4px",
                textTransform: "uppercase",
                letterSpacing: 0.5
              }}
            >
              교체 대상 기기
            </Text>
            <Section style={{ border: `1px solid ${ROW_BORDER}`, borderRadius: 8, padding: "8px 12px" }}>
              {devices.map((d, idx) => (
                <Section
                  key={`${d.label}-${idx}`}
                  style={{
                    borderBottom: idx === devices.length - 1 ? "none" : `1px solid ${ROW_BORDER}`,
                    padding: "10px 0"
                  }}
                >
                  <Text style={{ color: TEXT_PRIMARY, fontSize: 14, margin: 0 }}>
                    <strong>{d.label}</strong>
                  </Text>
                  <Text style={{ color: TEXT_SECONDARY, fontSize: 13, margin: "2px 0 0" }}>
                    교체 예정일 · {formatDate(d.replaceAt)} ({d.daysLeft}일 남음)
                  </Text>
                </Section>
              ))}
            </Section>

            <Hr style={{ borderColor: ROW_BORDER, margin: "24px 0 16px" }} />

            <Text style={{ color: TEXT_SECONDARY, fontSize: 12, margin: 0 }}>
              패드 교체 후 관리자 화면에서 신규 만료일을 등록하면 다음 알림 일정이 자동 갱신됩니다.
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

export default PadExpiryEmail
