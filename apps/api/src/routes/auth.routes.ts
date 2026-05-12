import { Router } from "express";

import {
  loginAdmin,
  requestAdminPasswordReset,
  resetAdminPassword
} from "../controllers/auth.controller";

const router = Router();

router.post("/auth/login", loginAdmin);
router.post("/auth/forgot-password", requestAdminPasswordReset);
router.post("/auth/reset-password", resetAdminPassword);

export default router;
