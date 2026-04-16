import Workspace from "../models/workspacemodel.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Create Workspace
export const createWorkspace = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    throw new ApiError(400, "Workspace name is required");
  }

  const workspace = await Workspace.create({
    name,
    description: description || "",
    owner: req.user._id,
    members: [{ user: req.user._id, role: "admin" }],
  });

  return res
    .status(201)
    .json(new ApiResponse(201, workspace, "Workspace created successfully"));
});

// Get User Workspaces
export const getUserWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await Workspace.find({
    "members.user": req.user._id,
  })
    .populate("owner", "name email")
    .populate("members.user", "name email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, workspaces, "Workspaces fetched successfully")
    );
});

// Add Member
export const addMember = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { userId, role } = req.body;

  if (!userId) {
    throw new ApiError(400, "userId is required");
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const requesterId = req.user._id;
  const isOwner = workspace.owner?.toString() === requesterId.toString();
  const requesterMember = workspace.members?.find(
    (m) => m.user?.toString() === requesterId.toString()
  );
  const isAdmin = isOwner || requesterMember?.role === "admin";
  if (!isAdmin) {
    throw new ApiError(403, "Only workspace admin can add members");
  }

  const alreadyMember = workspace.members?.some(
    (m) => m.user?.toString() === userId.toString()
  );
  if (alreadyMember) {
    throw new ApiError(409, "User is already a member of this workspace");
  }

  const validRole = role === "admin" ? "admin" : "member";
  workspace.members.push({ user: userId, role: validRole });
  await workspace.save();

  return res
    .status(200)
    .json(new ApiResponse(200, workspace, "Member added successfully"));
});

// Delete Workspace
export const deleteWorkspace = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  if (workspace.owner?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only workspace owner can delete workspace");
  }

  await workspace.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Workspace deleted successfully"));
});
