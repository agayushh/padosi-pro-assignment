import type { Request, Response } from "express";
import { requireUserId } from "../middleware/auth.js";
import { listCatalogue, listSelected, replaceSelection } from "../services/taskService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";
import { taskQuerySchema, taskSelectionSchema } from "../validation/schemas.js";

export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const query = taskQuerySchema.parse({
    q: typeof req.query.q === "string" ? req.query.q : "",
  });
  const categories = await listCatalogue(query.q);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "OK",
    data: { categories },
  });
});

export const getSelection = asyncHandler(async (req: Request, res: Response) => {
  const selection = await listSelected(requireUserId(req));
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "OK",
    data: selection,
  });
});

export const saveSelection = asyncHandler(async (req: Request, res: Response) => {
  const body = taskSelectionSchema.parse(req.body);
  const selection = await replaceSelection(requireUserId(req), body.taskIds);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Tasks saved.",
    data: selection,
  });
});
