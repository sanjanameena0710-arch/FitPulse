import { Router } from "express";
import { EXERCISES, WORKOUT_PLANS } from "./workouts.js";

const router = Router();

router.get("/", (req, res) => {
  const { category, search } = req.query;
  let results = EXERCISES;
  if (category) results = results.filter(e => e.category === category);
  if (search) results = results.filter(e => e.name.toLowerCase().includes((search as string).toLowerCase()));
  return res.json(results);
});

export const plansRouter = Router();
plansRouter.get("/", (req, res) => {
  return res.json(WORKOUT_PLANS);
});

export default router;
