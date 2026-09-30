import { Prisma } from "@prisma/client";
import prisma from "../config/prismaInstance.js";
import { env } from "../config/env.js";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  assessOtpAttempt,
  describeCooldown,
  describeOtpFailure,
  generateOtpCode,
  hashOtp,
  otpExpiresAt,
  otpMatches,
  resendCooldownRemaining,
} from "../domain/otp.js";
import { AppError } from "../utils/AppError.js";
import { errorMessages } from "../utils/ErrorMessage.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";
import { sendOtpEmail } from "./mailer.js";

export type IssuedOtp = {
  status: "sent" | "cooldown";
  expiresAt: Date;
  resendAvailableAt: Date;
  retryAfterSeconds: number;
};

function isUnique(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function issueOtp(userId: number, email: string): Promise<IssuedOtp> {
  const now = new Date();
  const existing = await prisma.emailOtp.findUnique({ where: { userId } });
  if (existing) {
    const wait = resendCooldownRemaining(existing.createdAt, now);
    if (wait > 0) {
      return {
        status: "cooldown",
        expiresAt: existing.expiresAt,
        resendAvailableAt: new Date(existing.createdAt.getTime() + OTP_RESEND_COOLDOWN_MS),
        retryAfterSeconds: Math.ceil(wait / 1000),
      };
    }
  }

  const code = generateOtpCode();
  const expiresAt = otpExpiresAt(now);
  const resendAvailableAt = new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS);
  await sendOtpEmail(email, code);

  const data = {
    codeHash: hashOtp(code, env.OTP_PEPPER),
    expiresAt,
    attempts: 0,
    usedAt: null,
    createdAt: now,
  };

  try {
    await prisma.emailOtp.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  } catch (error) {
    if (!isUnique(error)) throw error;
    await prisma.emailOtp.update({ where: { userId }, data });
  }

  return { status: "sent", expiresAt, resendAvailableAt, retryAfterSeconds: 0 };
}

export function cooldownError(issued: IssuedOtp): AppError {
  return new AppError(
    HTTP_STATUS.TOO_MANY_REQUESTS,
    "OTP_COOLDOWN",
    describeCooldown(issued.retryAfterSeconds * 1000),
    {
      retryAfterSeconds: issued.retryAfterSeconds,
      resendAvailableAt: issued.resendAvailableAt.toISOString(),
      expiresAt: issued.expiresAt.toISOString(),
    },
  );
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "OTP_INVALID", "That code is not right.");
  }
  if (user.emailVerifiedAt) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      "EMAIL_ALREADY_VERIFIED",
      errorMessages.AUTH.ALREADY_VERIFIED,
    );
  }

  const now = new Date();
  const consumed = await prisma.emailOtp.updateMany({
    where: {
      userId: user.id,
      codeHash: hashOtp(code, env.OTP_PEPPER),
      usedAt: null,
      expiresAt: { gt: now },
      attempts: { lt: OTP_MAX_ATTEMPTS },
    },
    data: { usedAt: now },
  });

  if (consumed.count === 1) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: now },
    });
    return;
  }

  const record = await prisma.emailOtp.findUnique({ where: { userId: user.id } });
  if (!record) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      "OTP_INVALID",
      "That code is not right. Request a new one.",
    );
  }

  const decision = assessOtpAttempt(record, now, otpMatches(code, record.codeHash, env.OTP_PEPPER));
  if (decision.ok) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      "OTP_USED",
      "This code has already been used. Request a new one.",
    );
  }

  if (decision.attempts !== record.attempts) {
    await prisma.emailOtp.update({
      where: { id: record.id },
      data: { attempts: decision.attempts },
    });
  }

  const described = describeOtpFailure(decision.code, decision.attempts);
  throw new AppError(HTTP_STATUS.BAD_REQUEST, decision.code, described.message, {
    attemptsRemaining: described.attemptsRemaining,
  });
}
