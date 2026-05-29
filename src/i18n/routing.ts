// next-intl 로케일 라우팅 정의 — 로케일 prefix 규칙과 지원 언어 목록
import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["ko", "en"],
  defaultLocale: "ko"
})

export type Locale = (typeof routing.locales)[number]
