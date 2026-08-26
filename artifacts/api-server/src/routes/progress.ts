import { Router } from "express";
import { db } from "@workspace/db";
import { progressTable, workoutsTable, goalsTable, achievementsTable } from "@workspace/db";
import { eq, desc, gte } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.authUserId;
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const entries = await db.select().from(progressTable)
      .where(eq(progressTable.userId, userId))
      .orderBy(desc(progressTable.date))
      .limit(days);

    return res.json(entries);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.authUserId;
    const { date, workoutsCompleted, caloriesBurned, minutesActive, weight, steps, mood } = req.body;
    if (!userId || !date || workoutsCompleted === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const [entry] = await db.insert(progressTable).values({
      userId, date, workoutsCompleted, caloriesBurned, minutesActive, weight, steps, mood,
    }).returning();
    return res.status(201).json(entry);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const userId = req.authUserId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const workouts = await db.select().from(workoutsTable)
      .where(eq(workoutsTable.userId, userId))
      .orderBy(desc(workoutsTable.completedAt))
      .limit(50);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyCalories = days.map(day => ({ day, calories: 0 }));
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);

    workouts.forEach(w => {
      if (!w.completedAt) return;
      const wDate = new Date(w.completedAt);
      if (wDate >= weekStart) {
        const dayIdx = wDate.getDay();
        weeklyCalories[dayIdx].calories += w.caloriesBurned || 0;
      }
    });

    const monthlyWorkouts = [
      { week: "Week 1", count: 0 }, { week: "Week 2", count: 0 },
      { week: "Week 3", count: 0 }, { week: "Week 4", count: 0 },
    ];
    workouts.forEach(w => {
      if (!w.completedAt) return;
      const daysAgo = Math.floor((now.getTime() - new Date(w.completedAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo < 28) {
        const weekIdx = Math.floor(daysAgo / 7);
        if (weekIdx < 4) monthlyWorkouts[3 - weekIdx].count++;
      }
    });

    const totalThisMonth = workouts.filter(w => {
      if (!w.completedAt) return false;
      const wDate = new Date(w.completedAt);
      return wDate.getMonth() === now.getMonth() && wDate.getFullYear() === now.getFullYear();
    }).length;

    const avgCalories = workouts.length > 0
      ? Math.floor(workouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0) / workouts.length)
      : 0;

    return res.json({
      weeklyCalories,
      monthlyWorkouts,
      totalThisMonth,
      averageCaloriesPerWorkout: avgCalories,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
