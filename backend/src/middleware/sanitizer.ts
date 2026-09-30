import type { NextFunction, Request, Response } from "express";

const SENSITIVE_FIELDS = new Set([
  "password",
  "confirmpassword",
  "confirm_password",
  "secret",
  "authorization",
  "otp",
  "code",
  "token",
  "jwt",
  "cookie",
  "set-cookie",
  "refreshtoken",
  "refresh_token",
  "accesstoken",
  "access_token",
  "passwordhash",
  "otp_pepper",
]);

const REDACTED = "[REDACTED]";

const redactObject = (obj: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      result[key] = REDACTED;
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = redactObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
};

export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  res.locals.sanitized = {
    body: req.body && typeof req.body === "object" ? redactObject(req.body) : req.body,
    query: redactObject(req.query as Record<string, unknown>),
    params: redactObject(req.params as Record<string, unknown>),
  };
  return next();
};
