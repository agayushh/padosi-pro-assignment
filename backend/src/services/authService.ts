import { Prisma } from "@prisma/client";
import prisma from "../config/prismaInstance.js";
import { decideLogin } from "../domain/loginRules.js";
import { dummyPasswordHash, hashPassword, verifyPassword } from "../domain/password.js";
import { decideRefresh } from "../domain/session.js";
import { AppError } from "../utils/AppError.js";
import { errorMessages } from "../utils/ErrorMessage.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";
import { cooldownError, issueOtp, verifyEmailCode } from "./otpService.js";
import type { PublicUser } from "./publicUser.js";
import {
  accessTokenExpiresIn,
  hashRefreshToken,
  newRefreshToken,
  refreshExpiry,
  signAccessToken,
} from "./tokens.js";
import { loadPublicUser } from "./userLoader.js";

type RegisterResult = {
  created: boolean;
  email: string;
  message: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  retryAfterSeconds: number;
};

function isUnique(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function deliverOtp(userId: number, email: string, created: boolean) {
  try {
    return await issueOtp(userId, email);
  } catch (error) {
    if (created) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
    throw error;
  }
}

export async function registerUser(input: {
  email: string;
  password: string;
}): Promise<RegisterResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing?.emailVerifiedAt) {
    throw new AppError(HTTP_STATUS.CONFLICT, "USER_EXISTS", errorMessages.AUTH.USER_EXISTS);
  }

  let user = existing;
  let created = false;
  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash: await hashPassword(input.password),
        },
      });
      created = true;
    } catch (error) {
      if (!isUnique(error)) throw error;
      user = await prisma.user.findUnique({ where: { email: input.email } });
      if (!user || user.emailVerifiedAt) {
        throw new AppError(HTTP_STATUS.CONFLICT, "USER_EXISTS", errorMessages.AUTH.USER_EXISTS);
      }
    }
  }

  const issued = await deliverOtp(user.id, user.email, created);
  if (issued.status === "cooldown") {
    return {
      created: false,
      email: user.email,
      message: "A code was just sent. Check your email, or wait a moment to request another.",
      expiresAt: issued.expiresAt,
      resendAvailableAt: issued.resendAvailableAt,
      retryAfterSeconds: issued.retryAfterSeconds,
    };
  }

  return {
    created,
    email: user.email,
    message: created
      ? "We sent a 6-digit code to your email."
      : "This email is not verified yet. We sent a new code.",
    expiresAt: issued.expiresAt,
    resendAvailableAt: issued.resendAvailableAt,
    retryAfterSeconds: 0,
  };
}

export async function resendOtp(email: string): Promise<RegisterResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "UNKNOWN_EMAIL", errorMessages.AUTH.UNKNOWN_EMAIL);
  }
  if (user.emailVerifiedAt) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      "EMAIL_ALREADY_VERIFIED",
      errorMessages.AUTH.ALREADY_VERIFIED,
    );
  }

  const issued = await issueOtp(user.id, user.email);
  if (issued.status === "cooldown") throw cooldownError(issued);

  return {
    created: false,
    email: user.email,
    message: "We sent a new 6-digit code to your email.",
    expiresAt: issued.expiresAt,
    resendAvailableAt: issued.resendAvailableAt,
    retryAfterSeconds: 0,
  };
}

export async function verifyEmail(email: string, code: string): Promise<void> {
  await verifyEmailCode(email, code);
}

type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  user: PublicUser;
};

async function startSession(userId: number): Promise<SessionTokens> {
  const refreshToken = newRefreshToken();
  await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiry(),
    },
  });
  const user = await loadPublicUser(userId);
  if (!user) {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", errorMessages.AUTH.UNAUTHORIZED);
  }
  return {
    accessToken: signAccessToken(userId),
    refreshToken,
    accessTokenExpiresIn: accessTokenExpiresIn(),
    user,
  };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<SessionTokens> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const passwordMatches = await verifyPassword(
    input.password,
    user?.passwordHash ?? dummyPasswordHash(),
  );
  const decision = decideLogin({
    userFound: user !== null,
    passwordMatches: user !== null && passwordMatches,
    emailVerified: user?.emailVerifiedAt != null,
  });

  if (!decision.ok) {
    if (decision.code === "EMAIL_NOT_VERIFIED") {
      throw new AppError(HTTP_STATUS.FORBIDDEN, "EMAIL_NOT_VERIFIED", errorMessages.AUTH.EMAIL_NOT_VERIFIED, {
        email: input.email,
      });
    }
    throw new AppError(
      HTTP_STATUS.UNAUTHORIZED,
      "INVALID_CREDENTIALS",
      errorMessages.AUTH.INVALID_CREDENTIALS,
    );
  }

  return startSession(user!.id);
}

export async function refreshSession(refreshToken: string): Promise<SessionTokens> {
  const now = new Date();
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hashRefreshToken(refreshToken) },
  });
  const decision = decideRefresh(session, now);

  if (decision === "missing" || !session) {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", errorMessages.AUTH.SESSION_EXPIRED);
  }
  if (decision === "reuse") {
    await prisma.session.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "SESSION_REUSE", errorMessages.AUTH.SESSION_REUSE);
  }
  if (decision === "expired") {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: now },
    });
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", errorMessages.AUTH.SESSION_EXPIRED);
  }

  const rotated = await prisma.session.updateMany({
    where: { id: session.id, revokedAt: null, expiresAt: { gt: now } },
    data: { revokedAt: now },
  });
  if (rotated.count !== 1) {
    await prisma.session.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "SESSION_REUSE", errorMessages.AUTH.SESSION_REUSE);
  }

  return startSession(session.userId);
}

export async function logoutSession(refreshToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: { refreshTokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
