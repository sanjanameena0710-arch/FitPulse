import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const cameraSessionsTable = pgTable("camera_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  exercise: text("exercise").notNull().default("Push-ups"),
  reps: integer("reps").notNull().default(0),
  duration: integer("duration").notNull().default(0),
  formStatus: text("form_status").notNull().default("ADJUST"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CameraSession = typeof cameraSessionsTable.$inferSelect;
export type InsertCameraSession = typeof cameraSessionsTable.$inferInsert;
