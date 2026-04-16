import asynchandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import User from "../models/usermodel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Register User
const registerUser = asynchandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Validation
  if (!name || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "User already exists with this email");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  // Remove password from response
  const userWithoutPassword = user.toObject();
  delete userWithoutPassword.password;

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        userWithoutPassword,
        "User registered successfully"
      )
    );
});

// Login User
const loginUser = asynchandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Compare password
  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Generate tokens
  const accessToken = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  // Save refresh token in database
  user.refreshToken = refreshToken;
  await user.save();

  // Remove password from response
  const userWithoutPassword = user.toObject();
  delete userWithoutPassword.password;

  return res
    .status(200)
    .cookie("accessToken", accessToken, { httpOnly: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true })
    .json(
      new ApiResponse(
        200,
        { user: userWithoutPassword, accessToken, refreshToken },
        "Login successful"
      )
    );
});

// Logout User
const logoutUser = asynchandler(async (req, res) => {
  const userId = req.user._id;

  // Clear refresh token
  await User.findByIdAndUpdate(userId, { refreshToken: null });

  return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, {}, "Logout successful"));
});

// Get User Profile
const getUserProfile = asynchandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile fetched successfully"));
});

// Update User Profile
const updateUserProfile = asynchandler(async (req, res) => {
  const userId = req.user._id;
  const { name, profilePicture } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    { name, profilePicture },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile updated successfully"));
});

export { registerUser, loginUser, logoutUser, getUserProfile, updateUserProfile };