// 알림 수신 대상이 되는 테넌트 관리자 역할 집합을 한 곳에서 정의하는 모듈
import { inArray, type SQL } from "drizzle-orm"
import { schema } from "@/lib/db"

/**
 * Tenant-level admin roles that should receive operational notifications
 * (inspection-complete, missed-inspection, pad/device expiry).
 *
 * Historically the recipient queries matched only the literal "ADMIN" role,
 * but real tenants are seeded with SUPER_ADMIN / HQ_ADMIN (see seeds/cnu/users.csv,
 * which has zero "ADMIN" users). That meant those admins received no alerts.
 * This set mirrors TENANT_WIDE in src/lib/tenant/scope-for-user.ts.
 */
export const TENANT_ADMIN_ROLES = [
  "SUPER_ADMIN",
  "HQ_ADMIN",
  "SYSTEM_ADMIN",
  "ADMIN"
] as const

export type TenantAdminRole = (typeof TENANT_ADMIN_ROLES)[number]

/** True when `role` is one of the tenant admin roles. */
export function isTenantAdminRole(role: string): boolean {
  return (TENANT_ADMIN_ROLES as ReadonlyArray<string>).includes(role)
}

/** Drizzle predicate: users.role IN (tenant admin roles). */
export function tenantAdminRoleFilter(): SQL {
  return inArray(schema.users.role, [...TENANT_ADMIN_ROLES])
}
