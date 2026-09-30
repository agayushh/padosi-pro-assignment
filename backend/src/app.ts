import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandling.js";
import { requestLogger } from "./middleware/logSecurity.js";
import { authLimiter } from "./middleware/rateLimit.js";
import { sanitizeRequest } from "./middleware/sanitizer.js";
import apiRoutes from "./routes/apiRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import { errorMessages } from "./utils/ErrorMessage.js";
import { HTTP_STATUS } from "./utils/httpStatus.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(cors());
  app.use(express.json({ limit: "32kb" }));
  app.use(sanitizeRequest);
  app.use(requestLogger);

  app.use(healthRoutes);
  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api", apiRoutes);

  app.use((_req, res) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      code: "NOT_FOUND",
      message: errorMessages.API.NOT_FOUND,
    });
  });
  app.use(errorHandler);
  return app;
}
