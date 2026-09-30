import type { Request } from "express";

export interface AuthRequest extends Request {
  userId?: number;
}
