import type { NextFunction, Request, Response } from "express";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const started = Date.now();
  res.on("finish", () => {
    const status = res.statusCode;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    console.log(
      JSON.stringify({
        level,
        method: req.method,
        path: req.originalUrl,
        status,
        durationMs: Date.now() - started,
        ip: req.ip,
      }),
    );
  });
  return next();
};
