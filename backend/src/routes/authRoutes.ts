import { Router } from "express";
import { login, logout, refresh, register, resend, verify } from "../controllers/authController.js";

const route = Router();

route.post("/register", register);
route.post("/verify-email", verify);
route.post("/resend-otp", resend);
route.post("/login", login);
route.post("/refresh", refresh);
route.post("/logout", logout);

export default route;
