import type { Request, Response } from "express";
import {
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
  resendOtp,
  verifyEmail,
} from "../services/authService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  resendSchema,
  verifyEmailSchema,
} from "../validation/schemas.js";

function otpPayload(result: {
  email: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  retryAfterSeconds: number;
}) {
  return {
    email: result.email,
    expiresAt: result.expiresAt.toISOString(),
    resendAvailableAt: result.resendAvailableAt.toISOString(),
    retryAfterSeconds: result.retryAfterSeconds,
  };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);
  const result = await registerUser(body);
  return res.status(result.created ? HTTP_STATUS.CREATED : HTTP_STATUS.OK).json({
    success: true,
    message: result.message,
    data: otpPayload(result),
  });
});

export const resend = asyncHandler(async (req: Request, res: Response) => {
  const body = resendSchema.parse(req.body);
  const result = await resendOtp(body.email);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: result.message,
    data: otpPayload(result),
  });
});

export const verify = asyncHandler(async (req: Request, res: Response) => {
  const body = verifyEmailSchema.parse(req.body);
  await verifyEmail(body.email, body.code);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Email verified. You can log in now.",
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);
  const result = await loginUser(body);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Logged in.",
    data: result,
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const body = refreshSchema.parse(req.body);
  const result = await refreshSession(body.refreshToken);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Session refreshed.",
    data: result,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const body = refreshSchema.parse(req.body);
  await logoutSession(body.refreshToken);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Logged out.",
  });
});
