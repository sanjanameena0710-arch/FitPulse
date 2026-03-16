import { Router } from "express";
import { db } from "@workspace/db";
import { goalsTable, achievementsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    if (!userId) return res.status(400).json({ error: "userId required" });
    const goals = await db.select().from(goalsTable).where(eq(goalsTable.userId, userId)).orderBy(desc(goalsTable.createdAt));
    return res.json(goals.map(g => ({ ...g, completed: g.completed === 1 })));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId, title, description, targetValue, currentValue, unit, deadline, category } = req.body;
    if (!userId || !title || targetValue === undefined) return res.status(400).json({ error: "Missing required fields" });
    const [goal] = await db.insert(goalsTable).values({
      userId, title, description, targetValue, currentValue: currentValue || 0, unit, deadline, category,
    }).returning();
    return res.status(201).json({ ...goal, completed: goal.completed === 1 });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { currentValue, completed, title, targetValue } = req.body;
    const updates: Record<string, unknown> = {};
    if (currentValue !== undefined) updates.currentValue = currentValue;
    if (completed !== undefined) updates.completed = completed ? 1 : 0;
    if (title !== undefined) updates.title = title;
    if (targetValue !== undefined) updates.targetValue = targetValue;
    const [goal] = await db.update(goalsTable).set(updates).where(eq(goalsTable.id, id)).returning();
    return res.json({ ...goal, completed: goal.completed === 1 });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

const achievementsRouter = Router();

achievementsRouter.get("/", async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    if (!userId) return res.status(400).json({ error: "userId required" });
    const achievements = await db.select().from(achievementsTable)
      .where(eq(achievementsTable.userId, userId))
      .orderBy(desc(achievementsTable.unlockedAt));
    return res.json(achievements);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { achievementsRouter };
export default router;
