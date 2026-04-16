import { Router } from "express";
import {
    registerUser,
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
route.route('/login').post(loginUser);
route.route('/logout').post(verifyToken, logoutUser);
route.route('/profile').get(verifyToken, getUserProfile);
route.route('/profile').put(verifyToken, updateUserProfile);

export default route;
//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWFiZWJkOWNhOGYyNDZhOTM4ZjMyMzUiLCJlbWFpbCI6ImphdGluQGdtYWlsLmNvbSIsImlhdCI6MTc3Mjg3NDg0MiwiZXhwIjoxNzcyODc1NzQyfQ.-MKeSCwNFXXtZRSaqHpSI1AOEq2ExBFsPfdLaImrYho