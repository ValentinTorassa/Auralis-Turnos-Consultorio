import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  appointmentTypes: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
    isPsychiatrist: v.boolean(),
    sortOrder: v.number(),
    code: v.optional(v.string()),
    requiresPatient: v.optional(v.boolean()),
    tracksPayment: v.optional(v.boolean()),
    supportsReminder: v.optional(v.boolean()),
    defaultDurationMin: v.optional(v.number()),
    isSystemType: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  patients: defineTable({
    userId: v.id("users"),
    fullName: v.string(),
    fullNameLower: v.string(),
    phone: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    careType: v.string(),
    adminNotes: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "fullNameLower"]),

  appointments: defineTable({
    userId: v.id("users"),
    patientId: v.optional(v.id("patients")),
    typeId: v.id("appointmentTypes"),
    title: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    status: v.union(
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("no_show"),
      v.literal("completed"),
    ),
    paymentStatus: v.union(
      v.literal("paid"),
      v.literal("unpaid"),
      v.literal("owes"),
      v.literal("na"),
    ),
    paymentMethod: v.optional(v.string()),
    paymentNotes: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    isPsychiatrist: v.boolean(),
    reminderEnabled: v.boolean(),
    seriesId: v.optional(v.string()),
    occurrenceIndex: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_start", ["userId", "startTime"])
    .index("by_patient", ["patientId"])
    .index("by_user_psychiatrist", ["userId", "isPsychiatrist", "startTime"]),

  psychiatristSlots: defineTable({
    userId: v.id("users"),
    startTime: v.number(),
    endTime: v.number(),
    state: v.union(
      v.literal("available"),
      v.literal("assigned"),
      v.literal("blocked"),
    ),
    appointmentId: v.optional(v.id("appointments")),
    generationKey: v.string(),
    monthKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_start", ["userId", "startTime"])
    .index("by_user_month", ["userId", "monthKey", "startTime"])
    .index("by_user_generation", ["userId", "generationKey"])
    .index("by_user_appointment", ["userId", "appointmentId"]),

  dailyTasks: defineTable({
    userId: v.id("users"),
    date: v.string(),
    title: v.string(),
    done: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_user_date", ["userId", "date"]),

  reminders: defineTable({
    userId: v.id("users"),
    patientId: v.optional(v.id("patients")),
    appointmentId: v.optional(v.id("appointments")),
    message: v.string(),
    dueAt: v.number(),
    active: v.boolean(),
    done: v.boolean(),
    notificationSentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user_active", ["userId", "active", "dueAt"])
    .index("by_user_due", ["userId", "dueAt"]),

  settings: defineTable({
    userId: v.id("users"),
    workDayStart: v.string(),
    workDayEnd: v.string(),
    defaultDurationMin: v.number(),
    psychiatristSlotCount: v.number(),
    psychiatristSlotDurationMin: v.number(),
    seeded: v.boolean(),
  }).index("by_user", ["userId"]),

  backupImports: defineTable({
    userId: v.id("users"),
    snapshotId: v.string(),
    importedAt: v.number(),
  }).index("by_user_snapshot", ["userId", "snapshotId"]),
});
