import { pgTable, uuid, text, timestamp, integer, jsonb, boolean, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────
// Roles:
//   SUPER_ADMIN   — cross-tenant operator
//   HQ_ADMIN      — tenant-wide (e.g. 안전관리본부 총괄)
//   DEPT_MANAGER  — single department scope
//   INSPECTOR     — field inspector under a department
//   SYSTEM_ADMIN/ADMIN — legacy aliases (kept until prod migration)
export const userRole = pgEnum("user_role", [
  "SUPER_ADMIN",
  "HQ_ADMIN",
  "DEPT_MANAGER",
  "INSPECTOR",
  "SYSTEM_ADMIN",
  "ADMIN"
])
export const orgPlan = pgEnum("org_plan", ["FREE", "STANDARD", "ENTERPRISE"])
export const notificationType = pgEnum("notification_type", [
  "MONTHLY_REMINDER",
  "MISSED_INSPECTION",
  "PAD_EXPIRY_D30",
  "PAD_EXPIRY_D7",
  "DEVICE_EXPIRY_D90",
  "INSPECTION_COMPLETE"
])
export const notificationStatus = pgEnum("notification_status", ["QUEUED", "SENT", "FAILED"])
export const auditAction = pgEnum("audit_action", ["CREATE", "UPDATE", "DELETE", "LOGIN", "EXPORT"])

// ─────────────────────────────────────────
// organizations
// ─────────────────────────────────────────
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug"),
    name: text("name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    plan: orgPlan("plan").notNull().default("FREE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    slugIdx: uniqueIndex("organizations_slug_idx").on(t.slug)
  })
)

// ─────────────────────────────────────────
// departments (sub-org under a tenant; e.g. CNU's 28 colleges)
// ─────────────────────────────────────────
export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    deviceQuota: integer("device_quota").notNull().default(0),
    managerUserId: uuid("manager_user_id"),
    isHq: boolean("is_hq").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantCodeIdx: uniqueIndex("departments_tenant_code_idx").on(t.tenantId, t.code),
    tenantIdx: index("departments_tenant_idx").on(t.tenantId)
  })
)

// ─────────────────────────────────────────
// users (multi-tenant via tenant_id)
// ─────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    role: userRole("role").notNull().default("INSPECTOR"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantEmailIdx: uniqueIndex("users_tenant_email_idx").on(t.tenantId, t.email),
    tenantIdx: index("users_tenant_idx").on(t.tenantId)
  })
)

// ─────────────────────────────────────────
// magic_link_tokens (Auth.js verification)
// ─────────────────────────────────────────
export const magicLinkTokens = pgTable(
  "magic_link_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull()
  },
  (t) => ({
    pk: uniqueIndex("magic_link_pk").on(t.identifier, t.token)
  })
)

// ─────────────────────────────────────────
// devices (AED equipment)
// ─────────────────────────────────────────
export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    code: text("code"),
    manufacturer: text("manufacturer").notNull(),
    model: text("model").notNull(),
    serial: text("serial").notNull(),
    manufacturedAt: timestamp("manufactured_at").notNull(),
    purchasedAt: timestamp("purchased_at").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    padReplaceAt: timestamp("pad_replace_at").notNull(),
    batteryReplaceAt: timestamp("battery_replace_at").notNull(),
    location: text("location").notNull(),
    locationDetail: text("location_detail"),
    available24h: boolean("available_24h").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantSerialIdx: uniqueIndex("devices_tenant_serial_idx").on(t.tenantId, t.serial),
    tenantIdx: index("devices_tenant_idx").on(t.tenantId)
  })
)

// ─────────────────────────────────────────
// device_managers (담당자 이력)
// ─────────────────────────────────────────
export const deviceManagers = pgTable(
  "device_managers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    validFrom: timestamp("valid_from").notNull(),
    validTo: timestamp("valid_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantDeviceIdx: index("device_mgr_tenant_device_idx").on(t.tenantId, t.deviceId)
  })
)

// ─────────────────────────────────────────
// inspections (12-item monthly check)
// ─────────────────────────────────────────
export const inspections = pgTable(
  "inspections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
    inspectorId: uuid("inspector_id").notNull().references(() => users.id),
    yearMonth: text("year_month").notNull(),
    items: jsonb("items").notNull().$type<Record<string, "OK" | "NG">>(),
    notes: text("notes"),
    signatureUrl: text("signature_url"),
    signatureSha256: text("signature_sha256"),
    docxUrl: text("docx_url"),
    pdfUrl: text("pdf_url"),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantDeviceMonthIdx: uniqueIndex("insp_tenant_device_month_idx").on(t.tenantId, t.deviceId, t.yearMonth),
    tenantMonthIdx: index("insp_tenant_month_idx").on(t.tenantId, t.yearMonth)
  })
)

// ─────────────────────────────────────────
// notifications (sent log)
// ─────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    payload: jsonb("payload"),
    status: notificationStatus("status").notNull().default("QUEUED"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantTypeIdx: index("notif_tenant_type_idx").on(t.tenantId, t.type),
    statusIdx: index("notif_status_idx").on(t.status)
  })
)

// ─────────────────────────────────────────
// audit_logs (compliance trail)
// ─────────────────────────────────────────
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id),
    action: auditAction("action").notNull(),
    resource: text("resource").notNull(),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantCreatedIdx: index("audit_tenant_created_idx").on(t.tenantId, t.createdAt)
  })
)

// ─────────────────────────────────────────
// Relations
// ─────────────────────────────────────────
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  devices: many(devices),
  inspections: many(inspections),
  departments: many(departments)
}))

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [departments.tenantId],
    references: [organizations.id]
  }),
  manager: one(users, {
    fields: [departments.managerUserId],
    references: [users.id]
  }),
  devices: many(devices)
}))

export const devicesRelations = relations(devices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [devices.tenantId],
    references: [organizations.id]
  }),
  managers: many(deviceManagers),
  inspections: many(inspections)
}))

export const inspectionsRelations = relations(inspections, ({ one }) => ({
  organization: one(organizations, {
    fields: [inspections.tenantId],
    references: [organizations.id]
  }),
  device: one(devices, {
    fields: [inspections.deviceId],
    references: [devices.id]
  }),
  inspector: one(users, {
    fields: [inspections.inspectorId],
    references: [users.id]
  })
}))
