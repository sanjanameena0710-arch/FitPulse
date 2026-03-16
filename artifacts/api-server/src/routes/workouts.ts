import { Router } from "express";
import { db } from "@workspace/db";
import { workoutsTable, goalsTable, achievementsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const WORKOUT_PLANS = [
  { id: 1, name: "Beginner Full Body", description: "Perfect for those starting their fitness journey", level: "beginner", duration: 4, category: "strength", isPremium: false, exercises: ["Push-ups", "Squats", "Plank", "Lunges", "Jumping Jacks"] },
  { id: 2, name: "HIIT Fat Burner", description: "High-intensity interval training to torch calories", level: "intermediate", duration: 6, category: "cardio", isPremium: false, exercises: ["Burpees", "Mountain Climbers", "Jump Squats", "High Knees", "Box Jumps"] },
  { id: 3, name: "Advanced Strength", description: "Build serious muscle with progressive overload", level: "advanced", duration: 8, category: "strength", isPremium: true, exercises: ["Deadlift", "Bench Press", "Pull-ups", "Overhead Press", "Rows"] },
  { id: 4, name: "Yoga & Flexibility", description: "Improve flexibility and mindfulness", level: "beginner", duration: 4, category: "flexibility", isPremium: false, exercises: ["Sun Salutation", "Warrior Pose", "Child's Pose", "Downward Dog", "Pigeon Pose"] },
  { id: 5, name: "5K Runner Plan", description: "Train to run your first 5K", level: "intermediate", duration: 8, category: "cardio", isPremium: true, exercises: ["Easy Run", "Interval Run", "Long Run", "Recovery Walk", "Strides"] },
];

const EXERCISES = [
  { id: 1, name: "Push-ups", category: "strength", muscleGroup: "chest", difficulty: "beginner", description: "Classic upper body exercise targeting chest, shoulders, and triceps", instructions: ["Start in plank position", "Lower chest to floor", "Push back up"], caloriesPerMinute: 7, equipment: "none" },
  { id: 2, name: "Squats", category: "strength", muscleGroup: "legs", difficulty: "beginner", description: "Fundamental lower body exercise", instructions: ["Stand feet shoulder-width apart", "Lower hips back and down", "Return to standing"], caloriesPerMinute: 8, equipment: "none" },
  { id: 3, name: "Deadlift", category: "strength", muscleGroup: "back", difficulty: "intermediate", description: "Full body compound movement", instructions: ["Stand with bar over feet", "Hinge at hips to grip bar", "Drive through heels to stand"], caloriesPerMinute: 9, equipment: "barbell" },
  { id: 4, name: "Plank", category: "strength", muscleGroup: "core", difficulty: "beginner", description: "Core stability exercise", instructions: ["Get into forearm position", "Keep body straight", "Hold the position"], caloriesPerMinute: 5, equipment: "none" },
  { id: 5, name: "Burpees", category: "cardio", muscleGroup: "full body", difficulty: "intermediate", description: "High intensity full body exercise", instructions: ["Start standing", "Jump down to push-up", "Jump back up with arms overhead"], caloriesPerMinute: 12, equipment: "none" },
  { id: 6, name: "Pull-ups", category: "strength", muscleGroup: "back", difficulty: "intermediate", description: "Upper body pulling exercise", instructions: ["Hang from bar", "Pull chest to bar", "Lower with control"], caloriesPerMinute: 8, equipment: "pull-up bar" },
  { id: 7, name: "Running", category: "cardio", muscleGroup: "legs", difficulty: "beginner", description: "Classic cardiovascular exercise", instructions: ["Warm up with walk", "Maintain steady pace", "Cool down"], caloriesPerMinute: 10, equipment: "none" },
  { id: 8, name: "Bench Press", category: "strength", muscleGroup: "chest", difficulty: "intermediate", description: "Horizontal pushing exercise", instructions: ["Lie on bench", "Lower bar to chest", "Press up"], caloriesPerMinute: 8, equipment: "barbell" },
  { id: 9, name: "Mountain Climbers", category: "cardio", muscleGroup: "core", difficulty: "beginner", description: "Dynamic core and cardio exercise", instructions: ["Start in plank", "Drive knees alternately to chest", "Keep core tight"], caloriesPerMinute: 10, equipment: "none" },
  { id: 10, name: "Lunges", category: "strength", muscleGroup: "legs", difficulty: "beginner", description: "Single leg lower body exercise", instructions: ["Step forward", "Lower back knee", "Return to start"], caloriesPerMinute: 7, equipment: "none" },
  { id: 11, name: "Overhead Press", category: "strength", muscleGroup: "shoulders", difficulty: "intermediate", description: "Vertical pushing exercise", instructions: ["Hold bar at shoulders", "Press overhead", "Lower with control"], caloriesPerMinute: 8, equipment: "barbell" },
  { id: 12, name: "Jump Rope", category: "cardio", muscleGroup: "full body", difficulty: "beginner", description: "Cardio skipping exercise", instructions: ["Hold handles", "Jump over rope", "Maintain rhythm"], caloriesPerMinute: 11, equipment: "jump rope" },
];

router.get("/", async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    const limit = parseInt(req.query.limit as string) || 20;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const workouts = await db.select().from(workoutsTable)
      .where(eq(workoutsTable.userId, userId))
      .orderBy(desc(workoutsTable.createdAt))
      .limit(limit);

    return res.json(workouts.map(w => ({ ...w, exercises: w.exercises || [] })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId, workoutName, category, duration, caloriesBurned, exercises, notes, completedAt } = req.body;
    if (!userId || !workoutName || !duration || caloriesBurned === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [workout] = await db.insert(workoutsTable).values({
      userId, workoutName, category, duration, caloriesBurned, exercises: exercises || [],
      notes, completedAt: completedAt ? new Date(completedAt) : new Date(),
    }).returning();

    return res.status(201).json({ ...workout, exercises: workout.exercises || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [workout] = await db.select().from(workoutsTable).where(eq(workoutsTable.id, id)).limit(1);
    if (!workout) return res.status(404).json({ error: "Workout not found" });
    return res.json({ ...workout, exercises: workout.exercises || [] });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { workoutName, duration, caloriesBurned, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (workoutName !== undefined) updates.workoutName = workoutName;
    if (duration !== undefined) updates.duration = duration;
    if (caloriesBurned !== undefined) updates.caloriesBurned = caloriesBurned;
    if (notes !== undefined) updates.notes = notes;
    const [workout] = await db.update(workoutsTable).set(updates).where(eq(workoutsTable.id, id)).returning();
    return res.json({ ...workout, exercises: workout.exercises || [] });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(workoutsTable).where(eq(workoutsTable.id, id));
    return res.json({ message: "Workout deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { WORKOUT_PLANS, EXERCISES };
export default router;
