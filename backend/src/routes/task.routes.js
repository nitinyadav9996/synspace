import { Router } from "express";
import {
  createTask,
  getWorkspaceTasks,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const route = Router();

route.use(verifyToken);

route.post("/", createTask);
route.get("/workspace/:workspaceId", getWorkspaceTasks);
route.put("/:taskId", updateTask);
route.delete("/:taskId", deleteTask);

export default route;
