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
  }).index("by_user", ["userId"]),

  patients: defineTable({
    userId: v.id("users"),
    fullName: v.string(),
    fullNameLower: v.string(),
    phone: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    careType: v.string(),
    adminNotes: v.optional(v.string()),
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
    notes: v.optional(v.string()),
    isPsychiatrist: v.boolean(),
    reminderEnabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_start", ["userId", "startTime"])
    .index("by_patient", ["patientId"])
    .index("by_user_psychiatrist", ["userId", "isPsychiatrist", "startTime"]),

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
});
