// 테넌트 관리자 역할 판별 로직을 검증하는 테스트
import { describe, it, expect } from "vitest"
import { isTenantAdminRole, TENANT_ADMIN_ROLES } from "./admin-roles"

describe("isTenantAdminRole", () => {
  it("matches every tenant admin role (incl. SUPER_ADMIN / HQ_ADMIN)", () => {
    for (const role of TENANT_ADMIN_ROLES) {
      expect(isTenantAdminRole(role)).toBe(true)
    }
  })

  it("recognizes the production-seeded HQ_ADMIN and SUPER_ADMIN roles", () => {
    expect(isTenantAdminRole("HQ_ADMIN")).toBe(true)
    expect(isTenantAdminRole("SUPER_ADMIN")).toBe(true)
  })

  it("does not treat non-admin roles as admins", () => {
    expect(isTenantAdminRole("INSPECTOR")).toBe(false)
    expect(isTenantAdminRole("DEPT_MANAGER")).toBe(false)
    expect(isTenantAdminRole("")).toBe(false)
  })
})
