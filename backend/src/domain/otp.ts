import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;

export type OtpFailureCode = "OTP_USED" | "OTP_EXPIRED" | "OTP_LOCKED" | "OTP_INVALID";

export type OtpAttemptResult =
  | { ok: true }
  | { ok: false; code: OtpFailureCode; attempts: number };

type OtpRecord = {
  expiresAt: Date;
  attempts: number;
  usedAt: Date | null;
};

// HMAC so a database copy of the code cannot be reversed without the server pepper.
export function hashOtp(code: string, pepper: string): string {
  return createHmac("sha256", pepper).update(code).digest("hex");
}

export function otpMatches(code: string, codeHash: string, pepper: string): boolean {
  const actual = Buffer.from(hashOtp(code, pepper), "hex");
  const expected = Buffer.from(codeHash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function generateOtpCode(
  nextInt: (min: number, max: number) => number = randomInt,
): string {
  return nextInt(0, 1_000_000).toString().padStart(OTP_LENGTH, "0");
}

export function otpExpiresAt(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + OTP_TTL_MS);
}

export function resendCooldownRemaining(lastSentAt: Date, now: Date): number {
  return Math.max(0, OTP_RESEND_COOLDOWN_MS - (now.getTime() - lastSentAt.getTime()));
}

export function assessOtpAttempt(
  record: OtpRecord,
  now: Date,
  codeMatches: boolean,
): OtpAttemptResult {
  if (record.usedAt) {
    return { ok: false, code: "OTP_USED", attempts: record.attempts };
  }
  if (now.getTime() >= record.expiresAt.getTime()) {
    return { ok: false, code: "OTP_EXPIRED", attempts: record.attempts };
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, code: "OTP_LOCKED", attempts: record.attempts };
  }
  if (!codeMatches) {
    const attempts = record.attempts + 1;
    return {
      ok: false,
      code: attempts >= OTP_MAX_ATTEMPTS ? "OTP_LOCKED" : "OTP_INVALID",
      attempts,
    };
  }
  return { ok: true };
}

export function describeOtpFailure(
  code: OtpFailureCode,
  attempts: number,
): { message: string; attemptsRemaining: number | null } {
  if (code === "OTP_INVALID") {
    const attemptsRemaining = Math.max(0, OTP_MAX_ATTEMPTS - attempts);
    const noun = attemptsRemaining === 1 ? "attempt" : "attempts";
    return {
      message: `That code is not right. ${attemptsRemaining} ${noun} left.`,
      attemptsRemaining,
    };
  }
  if (code === "OTP_EXPIRED") {
    return {
      message: "This code has expired. Request a new one.",
      attemptsRemaining: null,
    };
  }
  if (code === "OTP_USED") {
    return {
      message: "This code has already been used. Request a new one.",
      attemptsRemaining: null,
    };
  }
  return {
    message: "Too many wrong attempts. Request a new code.",
    attemptsRemaining: 0,
  };
}

export function describeCooldown(waitMs: number): string {
  const seconds = Math.max(1, Math.ceil(waitMs / 1000));
  const noun = seconds === 1 ? "second" : "seconds";
  return `Please wait ${seconds} ${noun} before requesting another code.`;
}
