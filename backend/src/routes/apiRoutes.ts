import { Router } from "express";
import { getMe, updateProfile } from "../controllers/profileController.js";
import { getSelection, listTasks, saveSelection } from "../controllers/taskController.js";
import { requireAuth } from "../middleware/auth.js";

const route = Router();

route.use(requireAuth);
route.get("/me", getMe);
route.put("/me/profile", updateProfile);
route.get("/tasks", listTasks);
route.get("/me/tasks", getSelection);
route.put("/me/tasks", saveSelection);

export default route;
