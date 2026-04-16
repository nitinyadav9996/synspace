import Task from "../models/task.model.js";
import Workspace from "../models/workspacemodel.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const isWorkspaceMember = (workspace, userId) => {
  if (!workspace) return false;
  const uid = userId?.toString();
  if (!uid) return false;

  if (workspace.owner?.toString() === uid) return true;
  return workspace.members?.some((m) => m.user?.toString() === uid) || false;
};

const isWorkspaceAdmin = (workspace, userId) => {
  if (!workspace) return false;
  const uid = userId?.toString();
  if (!uid) return false;

  if (workspace.owner?.toString() === uid) return true;
  const member = workspace.members?.find((m) => m.user?.toString() === uid);
  return member?.role === "admin";
};

// Create Task
export const createTask = asyncHandler(async (req, res) => {
  const { title, description, priority, assignedTo, dueDate, workspaceId } =
    req.body;

  if (!title || !workspaceId) {
    throw new ApiError(400, "Title and workspaceId are required");
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  if (!isWorkspaceMember(workspace, req.user._id)) {
    throw new ApiError(403, "You are not a member of this workspace");
  }

  const task = await Task.create({
    title,
    description: description || "",
    priority: priority || "medium",
    assignedTo: assignedTo || null,
    dueDate: dueDate || null,
    workspace: workspaceId,
    createdBy: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});

// Get Tasks of Workspace
export const getWorkspaceTasks = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  if (!isWorkspaceMember(workspace, req.user._id)) {
    throw new ApiError(403, "You are not a member of this workspace");
  }

  const tasks = await Task.find({ workspace: workspaceId })
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email");

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

// Update Task
export const updateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const workspace = await Workspace.findById(task.workspace);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  if (!isWorkspaceMember(workspace, req.user._id)) {
    throw new ApiError(403, "You are not a member of this workspace");
  }

  const canEdit =
    task.createdBy?.toString() === req.user._id.toString() ||
    isWorkspaceAdmin(workspace, req.user._id);

  if (!canEdit) {
    throw new ApiError(403, "You are not allowed to update this task");
  }

  const allowed = [
    "title",
    "description",
    "status",
    "priority",
    "dueDate",
    "assignedTo",
  ];
  for (const key of Object.keys(req.body || {})) {
    if (!allowed.includes(key)) delete req.body[key];
  }

  const updatedTask = await Task.findByIdAndUpdate(taskId, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTask, "Task updated successfully"));
});

// Delete Task
export const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const workspace = await Workspace.findById(task.workspace);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  if (!isWorkspaceMember(workspace, req.user._id)) {
    throw new ApiError(403, "You are not a member of this workspace");
  }

  const canDelete =
    task.createdBy?.toString() === req.user._id.toString() ||
    isWorkspaceAdmin(workspace, req.user._id);

  if (!canDelete) {
    throw new ApiError(403, "You are not allowed to delete this task");
  }

  await task.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Task deleted successfully"));
});