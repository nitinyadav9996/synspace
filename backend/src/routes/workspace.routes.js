import { Router } from "express";
import {
  createWorkspace,
  getUserWorkspaces,
  addMember,
  deleteWorkspace,
} from "../controllers/workspace.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const route = Router();

route.use(verifyToken);

route.post("/", createWorkspace);
route.get("/", getUserWorkspaces);
route.post("/:workspaceId/member", addMember);
route.delete("/:workspaceId", deleteWorkspace);

export default route;
