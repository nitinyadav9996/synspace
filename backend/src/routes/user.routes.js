import { Router } from "express";
import {
    registerUser,
    verifyEmailOtp,
    resendVerificationOtp,
    loginUser,
    logoutUser,
    getUserProfile,
    updateUserProfile,
} from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

// create a fresh router instance
const route = Router();

// define the routes
route.route('/register').post(registerUser);
route.route('/verify-email').post(verifyEmailOtp);
route.route('/resend-verification-otp').post(resendVerificationOtp);
route.route('/login').post(loginUser);
route.route('/logout').post(verifyToken, logoutUser);
route.route('/profile').get(verifyToken, getUserProfile);
route.route('/profile').put(verifyToken, updateUserProfile);

export default route;
