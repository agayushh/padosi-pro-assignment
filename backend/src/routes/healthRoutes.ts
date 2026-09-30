import { Router } from "express";
import { dbConnection } from "../controllers/status/dbConnection.js";
import { healthCheck } from "../controllers/status/health.js";

const route = Router();

route.get("/healthz", healthCheck);
route.get("/readyz", dbConnection);

export default route;
