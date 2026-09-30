import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const ACCESS_TOKEN_SECONDS = 15 * 60;

export function signAccessToken(userId: number): string {
  return jwt.sign({ type: "access" }, env.ACCESS_TOKEN_SECRET, {
    subject: String(userId),
    expiresIn: ACCESS_TOKEN_SECONDS,
    algorithm: "HS256",
  });
}

export function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function accessTokenExpiresIn(): number {
  return ACCESS_TOKEN_SECONDS;
}

export function refreshExpiry(now = new Date()): Date {
  return new Date(now.getTime() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
}
