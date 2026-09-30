import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const healthCheck = asyncHandler(async (_req: Request, res: Response) => {
  return res.status(200).json({
    uptime: process.uptime(),
    message: "ok",
    timestamp: Date.now(),
  });
});
