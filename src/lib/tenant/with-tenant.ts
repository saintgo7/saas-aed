import { eq, and, SQL } from "drizzle-orm"
import { db, schema } from "@/lib/db"

/**
 * Tenant Guard — Layer 3 of the 3-layer isolation.
 *
 * Direct `db.*` calls are forbidden by ESLint rule (see eslint.config.mjs).
 * All queries must go through this helper, which forcibly attaches
 * `WHERE tenant_id = ?` to every query.
 */
export class TenantScope {
  constructor(public readonly tenantId: string) {
    if (!tenantId) throw new Error("TenantScope: tenantId is required")
  }

  devices() {
    return {
      list: () =>
        db.select().from(schema.devices).where(eq(schema.devices.tenantId, this.tenantId)),
      findById: (id: string) =>
        db
          .select()
          .from(schema.devices)
          .where(and(eq(schema.devices.tenantId, this.tenantId), eq(schema.devices.id, id))),
      create: (data: typeof schema.devices.$inferInsert) =>
        db.insert(schema.devices).values({ ...data, tenantId: this.tenantId }).returning()
    }
  }

  inspections() {
    return {
      list: (extra?: SQL) =>
        db
          .select()
          .from(schema.inspections)
          .where(extra ? and(eq(schema.inspections.tenantId, this.tenantId), extra) : eq(schema.inspections.tenantId, this.tenantId)),
      findById: (id: string) =>
        db
          .select()
          .from(schema.inspections)
          .where(and(eq(schema.inspections.tenantId, this.tenantId), eq(schema.inspections.id, id))),
      create: (data: typeof schema.inspections.$inferInsert) =>
        db.insert(schema.inspections).values({ ...data, tenantId: this.tenantId }).returning()
    }
  }

  users() {
    return {
      list: () =>
        db.select().from(schema.users).where(eq(schema.users.tenantId, this.tenantId))
    }
  }
}

export function withTenant(tenantId: string): TenantScope {
  return new TenantScope(tenantId)
}
