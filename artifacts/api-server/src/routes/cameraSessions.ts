import { Router } from "express";
import { db, cameraSessionsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();

function parseNonNegativeInteger(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

router.get("/", async (req, res) => {
  try {
    const userId = req.authUserId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const requestedLimit = Number(req.query.limit || 20);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
    const sessions = await db.select().from(cameraSessionsTable)
      .where(eq(cameraSessionsTable.userId, userId))
      .orderBy(desc(cameraSessionsTable.completedAt))
      .limit(limit);

    return res.json(sessions);
  } catch (error) {
    console.error("Get camera sessions error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.authUserId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const exercise = typeof req.body.exercise === "string" && req.body.exercise.trim()
      ? req.body.exercise.trim().slice(0, 80)
      : "Push-ups";
    const reps = parseNonNegativeInteger(req.body.reps);
    const duration = parseNonNegativeInteger(req.body.duration);
    const formStatus = req.body.formStatus === "GOOD" ? "GOOD" : "ADJUST";
    const completedAt = req.body.completedAt ? new Date(req.body.completedAt) : new Date();

    if (reps === null || duration === null || Number.isNaN(completedAt.getTime())) {
      return res.status(400).json({ error: "reps, duration and a valid completedAt are required" });
    }

    const [session] = await db.insert(cameraSessionsTable).values({
      userId,
      exercise,
      reps,
      duration,
      formStatus,
      completedAt,
    }).returning();

    return res.status(201).json(session);
  } catch (error) {
    console.error("Create camera session error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
