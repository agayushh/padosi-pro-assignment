import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthRequest } from "../types/AuthRequest.js";
import { AppError } from "../utils/AppError.js";
import { errorMessages } from "../utils/ErrorMessage.js";

export function requireUserId(req: Request): number {
  const userId = (req as AuthRequest).userId;
  if (!userId) {
    throw new AppError(401, "UNAUTHORIZED", errorMessages.AUTH.UNAUTHORIZED);
  }
  return userId;
}

export const requireAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", errorMessages.AUTH.UNAUTHORIZED));
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
      algorithms: ["HS256"],
    }) as JwtPayload;
    const userId = Number(decoded.sub);
    if (decoded.type !== "access" || !Number.isInteger(userId) || userId <= 0) {
      return next(new AppError(401, "UNAUTHORIZED", errorMessages.AUTH.UNAUTHORIZED));
    }
    req.userId = userId;
    return next();
  } catch {
    return next(new AppError(401, "UNAUTHORIZED", errorMessages.AUTH.SESSION_EXPIRED));
  }
};
