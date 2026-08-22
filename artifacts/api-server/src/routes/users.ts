import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, workoutsTable, progressTable } from "@workspace/db";
import { eq, desc, gte, sql } from "drizzle-orm";
import { verifyPassword, hashPassword } from "../lib/auth.js";

const router = Router();

router.get("/profile", async (req, res) => {
  try {
    const userId = req.authUserId;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({
      id: user.id, name: user.name, email: user.email, fitnessGoal: user.fitnessGoal,
      age: user.age, weight: user.weight, height: user.height, activityLevel: user.activityLevel,
      avatarUrl: user.avatarUrl, bio: user.bio, createdAt: user.createdAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const { name, age, weight, height, activityLevel, fitnessGoal, bio } = req.body;
    const userId = req.authUserId;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (age !== undefined) updates.age = age;
    if (weight !== undefined) updates.weight = weight;
    if (height !== undefined) updates.height = height;
    if (activityLevel !== undefined) updates.activityLevel = activityLevel;
    if (fitnessGoal !== undefined) updates.fitnessGoal = fitnessGoal;
    if (bio !== undefined) updates.bio = bio;

    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
    return res.json({
      id: user.id, name: user.name, email: user.email, fitnessGoal: user.fitnessGoal,
      age: user.age, weight: user.weight, height: user.height, activityLevel: user.activityLevel,
      avatarUrl: user.avatarUrl, bio: user.bio, createdAt: user.createdAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const userId = req.authUserId;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const workouts = await db.select().from(workoutsTable).where(eq(workoutsTable.userId, userId));
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    const totalWorkouts = workouts.length;
    const totalCaloriesBurned = workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
    const totalMinutes = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const thisWeekWorkouts = workouts.filter(w => w.completedAt && new Date(w.completedAt) >= weekStart);
    const thisWeekCalories = thisWeekWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

    let bmi = null;
    let bmiCategory = null;
    if (user?.weight && user?.height) {
      const heightM = user.height / 100;
      bmi = parseFloat((user.weight / (heightM * heightM)).toFixed(1));
      if (bmi < 18.5) bmiCategory = "Underweight";
      else if (bmi < 25) bmiCategory = "Normal";
      else if (bmi < 30) bmiCategory = "Overweight";
      else bmiCategory = "Obese";
    }

    const progress = await db.select().from(progressTable)
      .where(eq(progressTable.userId, userId))
      .orderBy(desc(progressTable.date));

    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    const sortedDates = progress.map(p => p.date).sort((a, b) => b.localeCompare(a));

    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expected = expectedDate.toISOString().split("T")[0];
      if (sortedDates[i] === expected) {
        streak++;
        if (i === 0 || i === 1) currentStreak = streak;
      } else {
        break;
      }
    }
    longestStreak = Math.max(streak, longestStreak);

    return res.json({
      totalWorkouts, totalCaloriesBurned, totalMinutes,
      currentStreak: currentStreak || 0, longestStreak: longestStreak || 0,
      thisWeekWorkouts: thisWeekWorkouts.length, thisWeekCalories,
      bmi, bmiCategory,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/change-email", async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const userId = req.authUserId;
    if (!userId || !newEmail || !password) {
      return res.status(400).json({ error: "userId, newEmail and password required" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Incorrect password", message: "Current password is incorrect" });
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, newEmail)).limit(1);
    if (existing.length > 0 && existing[0].id !== userId) {
      return res.status(409).json({ error: "Email taken", message: "This email is already in use" });
    }
    const [updated] = await db.update(usersTable).set({ email: newEmail, updatedAt: new Date() }).where(eq(usersTable.id, userId)).returning();
    return res.json({ id: updated.id, email: updated.email, name: updated.name });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.authUserId;
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "userId, currentPassword and newPassword required" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return res.status(401).json({ error: "Incorrect password", message: "Current password is incorrect" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Weak password", message: "Password must be at least 6 characters" });
    }
    await db.update(usersTable).set({ passwordHash: hashPassword(newPassword), updatedAt: new Date() }).where(eq(usersTable.id, userId));
    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
