import type { NextFunction, Request, Response } from "express";
import { parseToken } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      authUserId?: number;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  const userId = parseToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", message: "A valid login is required." });
  }
  req.authUserId = userId;
  return next();
}