// next-intl 로케일 인식 네비게이션 — next/link·next/navigation 대신 이 파일에서 import
import { createNavigation } from "next-intl/navigation"
import { routing } from "./routing"

export const { Link, redirect, permanentRedirect, usePathname, useRouter } =
  createNavigation(routing)
