import asynchandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import User from "../models/usermodel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

const generateOtp = () =>
  String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");

const hashOtp = (otp) =>
  crypto.createHash("sha256").update(String(otp)).digest("hex");

const getOtpExpiryDate = () =>
  new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

const sendEmailVerificationOtp = async ({ email, name, otp }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "SyncSpace Nexus";

  if (!apiKey || !senderEmail) {
    throw new ApiError(
      500,
      "Email service is not configured. Set BREVO_API_KEY and BREVO_SENDER_EMAIL."
    );
  }

  const payload = {
   sender: {
      email: senderEmail,
      name: senderName,
    },
    to: [{ email, name: name || "User" }],
    subject: "Verify your email - SyncSpace Nexus",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Email Verification</h2>
        <p>Hello ${name || "there"},</p>
        <p>Your OTP for email verification is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        <p>This OTP is valid for ${OTP_EXPIRY_MINUTES} minutes.</p>
      </div>
    `,
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new ApiError(
      502,
      `Failed to send verification email: ${errorPayload || response.statusText}`
    );
  }
};

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  };
};

// Register User
const registerUser = asynchandler(async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = String(email || "").toLowerCase().trim();

  // Validation
  if (!name || !normalizedEmail || !password) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser && existingUser.isEmailVerified) {
    throw new ApiError(409, "User already exists with this email");
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const otpExpiry = getOtpExpiryDate();

  if (existingUser) {
    existingUser.name = name;
    existingUser.password = await bcrypt.hash(password, 10);
    existingUser.emailVerificationOtpHash = otpHash;
    existingUser.emailVerificationOtpExpiry = otpExpiry;
    await existingUser.save();

    await sendEmailVerificationOtp({ email: normalizedEmail, name, otp });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          email: existingUser.email,
          isEmailVerified: false,
        },
        "User exists but email is not verified. New OTP sent to email."
      )
    );
  }

  // Create user
  const user = await User.create({
    name,
    email: normalizedEmail,
    password: await bcrypt.hash(password, 10),
    isEmailVerified: false,
    emailVerificationOtpHash: otpHash,
    emailVerificationOtpExpiry: otpExpiry,
  });

  await sendEmailVerificationOtp({ email: normalizedEmail, name, otp });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        {
          email: user.email,
          isEmailVerified: false,
        },
        "Registration successful. OTP sent to your email for verification."
      )
    );
});

const verifyEmailOtp = asynchandler(async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = String(email || "").toLowerCase().trim();

  if (!normalizedEmail || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isEmailVerified) {
    return res
      .status(200)
      .json(new ApiResponse(200, { email: user.email }, "Email already verified"));
  }

  if (!user.emailVerificationOtpHash || !user.emailVerificationOtpExpiry) {
    throw new ApiError(400, "OTP is missing. Please request a new OTP.");
  }

  if (user.emailVerificationOtpExpiry.getTime() < Date.now()) {
    throw new ApiError(400, "OTP expired. Please request a new OTP.");
  }

  if (hashOtp(otp) !== user.emailVerificationOtpHash) {
    throw new ApiError(400, "Invalid OTP");
  }

  user.isEmailVerified = true;
  user.emailVerificationOtpHash = null;
  user.emailVerificationOtpExpiry = null;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { email: user.email }, "Email verified successfully"));
});

const resendVerificationOtp = asynchandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = String(email || "").toLowerCase().trim();

  if (!normalizedEmail) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, "Email is already verified");
  }

  const otp = generateOtp();
  user.emailVerificationOtpHash = hashOtp(otp);
  user.emailVerificationOtpExpiry = getOtpExpiryDate();
  await user.save();

  await sendEmailVerificationOtp({ email: user.email, name: user.name, otp });

  return res
    .status(200)
    .json(new ApiResponse(200, { email: user.email }, "OTP resent successfully"));
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

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before login");
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
  const cookieOptions = getCookieOptions();

  // Save refresh token in database
  user.refreshToken = refreshToken;
  await user.save();

  // Remove password from response
  const userWithoutPassword = user.toObject();
  delete userWithoutPassword.password;

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
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
    .clearCookie("accessToken", getCookieOptions())
    .clearCookie("refreshToken", getCookieOptions())
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

export {
  registerUser,
  verifyEmailOtp,
  resendVerificationOtp,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
};
