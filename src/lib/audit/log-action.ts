import { db, schema } from "@/lib/db"

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

/**
 * Human-readable action names used in server actions.
 * These map to the `auditAction` enum stored in the DB.
 * The original action name is preserved in metadata.actionName.
 */
export type ActionName =
  | "createTenant"
  | "disableTenant"
  | "enableTenant"
  | "updateTenantContact"
  | "inviteUser"
  | "updateUserRole"
  | "removeUser"
  | "createDepartment"
  | "deleteDepartment"
  | "updateDepartmentManager"

export type AuditActionEnum = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "EXPORT"

export interface LogActionParams {
  /** ID of the user performing the action */
  actorId: string | null | undefined
  /** Tenant context. Required for tenant-scoped actions */
  tenantId: string | null | undefined
  /** Human-readable action name (e.g. "createTenant") */
  action: ActionName
  /** Resource type (e.g. "tenant", "user", "department") */
  targetType?: string
  /** Resource UUID or slug */
  targetId?: string
  /** Sanitized payload — passwords/tokens are stripped automatically */
  payload?: Record<string, unknown>
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

/** Sensitive keys that must never appear in audit metadata */
const SENSITIVE_KEYS = new Set(["password", "token", "secret", "apiKey", "api_key"])

function sanitizePayload(
  payload: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!payload) return undefined

  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !SENSITIVE_KEYS.has(key.toLowerCase()))
  )
}

/**
 * Maps a human-readable action name to the DB enum value.
 * Create/invite → CREATE, update/assign → UPDATE, delete/remove/disable → DELETE.
 */
function toAuditActionEnum(action: ActionName): AuditActionEnum {
  if (
    action === "createTenant" ||
    action === "inviteUser" ||
    action === "createDepartment"
  ) {
    return "CREATE"
  }
  if (
    action === "disableTenant" ||
    action === "removeUser" ||
    action === "deleteDepartment"
  ) {
    return "DELETE"
  }
  // enableTenant, updateTenantContact, updateUserRole, updateDepartmentManager
  return "UPDATE"
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────

/**
 * Fire-and-forget audit logger.
 *
 * Analogous to a post-office drop box: you slip in the envelope and walk away —
 * it's the post office's problem if it catches fire. Your main flow never blocks.
 *
 * - Never throws; failures are console.warn only.
 * - Strips sensitive keys from payload before persisting.
 * - Skips insert if tenantId is missing (cross-tenant SUPER_ADMIN system ops
 *   could be logged differently in future; for now we skip gracefully).
 */
export async function logAction(params: LogActionParams): Promise<void> {
  const { actorId, tenantId, action, targetType, targetId, payload } = params

  if (!tenantId) {
    console.warn("[audit] logAction skipped — tenantId missing", { action, targetType, targetId })
    return
  }

  const sanitized = sanitizePayload(payload)
  const metadata: Record<string, unknown> = {
    actionName: action,
    ...(sanitized ?? {})
  }

  try {
    await db.insert(schema.auditLogs).values({
      tenantId,
      actorId: actorId ?? null,
      action: toAuditActionEnum(action),
      resource: targetType ?? action,
      resourceId: targetId ?? null,
      metadata
    })
  } catch (error) {
    console.warn("[audit] logAction insert failed", { action, tenantId, error })
  }
}
