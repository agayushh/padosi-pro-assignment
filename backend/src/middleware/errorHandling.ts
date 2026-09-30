import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { errorMessages } from "../utils/ErrorMessage.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof AppError) {
    return res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
      ...error.details,
    });
  }

  if (error instanceof ZodError) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: errorMessages.API.VALIDATION,
      errors: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return res.status(HTTP_STATUS.CONFLICT).json({
      success: false,
      code: "CONFLICT",
      message: "That record already exists.",
    });
  }

  if (error instanceof SyntaxError && "body" in error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: "INVALID_JSON",
      message: errorMessages.API.INVALID_JSON,
    });
  }

  console.error(error);
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: errorMessages.API.INTERNAL_SERVER_ERROR,
    error:
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : undefined,
  });
};
