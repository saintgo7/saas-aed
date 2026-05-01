import { describe, it, expect } from "vitest"
import { withTenant, TenantScope } from "./with-tenant"

describe("withTenant", () => {
  it("throws when tenantId is empty string", () => {
    expect(() => withTenant("")).toThrow(/tenantId is required/)
  })

  it("throws when tenantId is null-like", () => {
    expect(() => withTenant(null as unknown as string)).toThrow(
      /tenantId is required/
    )
  })

  it("returns a TenantScope instance for a valid tenant id", () => {
    const scope = withTenant("11111111-2222-3333-4444-555555555555")
    expect(scope).toBeInstanceOf(TenantScope)
    expect(scope.tenantId).toBe("11111111-2222-3333-4444-555555555555")
  })
})

describe("TenantScope methods", () => {
  const scope = withTenant("11111111-2222-3333-4444-555555555555")

  it("exposes devices() with list/findById/create functions", () => {
    const devices = scope.devices()
    expect(typeof devices.list).toBe("function")
    expect(typeof devices.findById).toBe("function")
    expect(typeof devices.create).toBe("function")
  })

  it("exposes inspections() with list/findById/create functions", () => {
    const inspections = scope.inspections()
    expect(typeof inspections.list).toBe("function")
    expect(typeof inspections.findById).toBe("function")
    expect(typeof inspections.create).toBe("function")
  })

  it("exposes users() with a list function", () => {
    const users = scope.users()
    expect(typeof users.list).toBe("function")
  })
})
