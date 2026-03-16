import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken } from "../lib/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, fitnessGoal, age, weight, height, activityLevel } = req.body;

    if (!name || !email || !password || !fitnessGoal) {
      return res.status(400).json({ error: "Missing required fields", message: "name, email, password, fitnessGoal are required" });
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already exists", message: "An account with this email already exists" });
    }

    const passwordHash = hashPassword(password);
    const [user] = await db.insert(usersTable).values({
      name, email, passwordHash, fitnessGoal, age, weight, height, activityLevel: activityLevel || "moderately_active"
    }).returning();

    const token = generateToken(user.id);

    return res.status(201).json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        fitnessGoal: user.fitnessGoal, age: user.age, weight: user.weight, height: user.height,
        activityLevel: user.activityLevel, createdAt: user.createdAt,
      }
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields", message: "Email and password required" });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid credentials", message: "Email or password is incorrect" });
    }

    const token = generateToken(user.id);
    return res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        fitnessGoal: user.fitnessGoal, age: user.age, weight: user.weight, height: user.height,
        activityLevel: user.activityLevel, createdAt: user.createdAt,
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  return res.json({ message: "If an account exists, a reset link has been sent." });
});

export default router;
