import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import workoutsRouter from "./workouts.js";
import exercisesRouter, { plansRouter } from "./exercises.js";
import progressRouter from "./progress.js";
import goalsRouter, { achievementsRouter } from "./goals.js";
import cameraSessionsRouter from "./cameraSessions.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(requireAuth);
router.use("/users", usersRouter);
router.use("/workouts", workoutsRouter);
router.use("/workout-plans", plansRouter);
router.use("/exercises", exercisesRouter);
router.use("/progress", progressRouter);
router.use("/goals", goalsRouter);
router.use("/achievements", achievementsRouter);
router.use("/camera-sessions", cameraSessionsRouter);

export default router;
