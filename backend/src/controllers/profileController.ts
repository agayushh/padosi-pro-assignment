import type { Request, Response } from "express";
import prisma from "../config/prismaInstance.js";
import { requireUserId } from "../middleware/auth.js";
import { toPublicUser } from "../services/publicUser.js";
import { loadPublicUser } from "../services/userLoader.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { errorMessages } from "../utils/ErrorMessage.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";
import { profileSchema } from "../validation/schemas.js";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await loadPublicUser(requireUserId(req));
  if (!user) {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", errorMessages.AUTH.UNAUTHORIZED);
  }
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "OK",
    data: user,
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const body = profileSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: body.name,
      mobile: body.mobile,
      address: body.address,
      businessName: body.businessName ?? null,
      profileCompleted: true,
    },
    include: { _count: { select: { tasks: true } } },
  });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Profile saved.",
    data: toPublicUser(user, user._count.tasks),
  });
});
