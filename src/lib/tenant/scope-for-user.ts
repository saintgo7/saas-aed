import { eq, and, SQL } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { TenantScope } from "./with-tenant"

/**
 * Role-aware scope.
 *
 * Layered on top of TenantScope (L3 tenant guard).
 * - SUPER_ADMIN: tenant-wide (no extra filter beyond tenantId)
 * - HQ_ADMIN:    tenant-wide (no extra filter beyond tenantId)
 * - DEPT_MANAGER / INSPECTOR: restricted to their own departmentId
 * - SYSTEM_ADMIN / ADMIN: legacy → tenant-wide (until prod migration)
 *
 * If a DEPT_MANAGER / INSPECTOR has a null departmentId, the scope returns
 * impossible filters (no rows) — fail-closed by design.
 */

type Role =
  | "SUPER_ADMIN"
  | "HQ_ADMIN"
  | "DEPT_MANAGER"
  | "INSPECTOR"
  | "SYSTEM_ADMIN"
  | "ADMIN"

interface SessionLike {
  tenantId: string
  departmentId: string | null
  role: Role
}

const TENANT_WIDE: ReadonlyArray<Role> = [
  "SUPER_ADMIN",
  "HQ_ADMIN",
  "SYSTEM_ADMIN",
  "ADMIN"
]

export class UserScope {
  readonly tenantId: string
  readonly departmentId: string | null
  readonly role: Role
  private readonly tenantWide: boolean

  constructor(session: SessionLike) {
    if (!session.tenantId) throw new Error("UserScope: tenantId is required")
    this.tenantId = session.tenantId
    this.departmentId = session.departmentId
    this.role = session.role
    this.tenantWide = TENANT_WIDE.includes(session.role)
  }

  isTenantWide(): boolean {
    return this.tenantWide
  }

  canManageDepartments(): boolean {
    return this.role === "SUPER_ADMIN" || this.role === "HQ_ADMIN"
  }

  canViewHq(): boolean {
    return this.role === "SUPER_ADMIN" || this.role === "HQ_ADMIN"
  }

  /** Department filter applied to every query for non-tenant-wide roles. */
  private deptFilter<T extends { departmentId: unknown }>(table: T): SQL | undefined {
    if (this.tenantWide) return undefined
    if (!this.departmentId) {
      // Fail-closed: a DEPT_MANAGER without departmentId can see nothing.
      return eq(table.departmentId as never, "00000000-0000-0000-0000-000000000000")
    }
    return eq(table.departmentId as never, this.departmentId)
  }

  devices() {
    const tenant = eq(schema.devices.tenantId, this.tenantId)
    const dept = this.deptFilter(schema.devices)
    const where = dept ? and(tenant, dept) : tenant
    return {
      list: () => db.select().from(schema.devices).where(where),
      findById: (id: string) =>
        db
          .select()
          .from(schema.devices)
          .where(and(where, eq(schema.devices.id, id)))
    }
  }

  inspections() {
    const tenant = eq(schema.inspections.tenantId, this.tenantId)
    return {
      list: (extra?: SQL) => {
        if (this.tenantWide) {
          const where = extra ? and(tenant, extra) : tenant
          return db.select().from(schema.inspections).where(where)
        }
        // For dept-scoped roles, filter inspections via device.departmentId join.
        const deptId = this.departmentId ?? "00000000-0000-0000-0000-000000000000"
        const base = db
          .select()
          .from(schema.inspections)
          .innerJoin(schema.devices, eq(schema.inspections.deviceId, schema.devices.id))
          .where(
            extra
              ? and(tenant, eq(schema.devices.departmentId, deptId), extra)
              : and(tenant, eq(schema.devices.departmentId, deptId))
          )
        return base
      }
    }
  }

  /** Raw tenant-only scope, for cases that genuinely need it (HQ aggregations). */
  tenant(): TenantScope {
    return new TenantScope(this.tenantId)
  }
}

export function scopeForUser(session: SessionLike): UserScope {
  return new UserScope(session)
}
