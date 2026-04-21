import { Router } from "express";

import { loginAdmin } from "../controllers/auth.controller";

const router = Router();

router.post("/auth/login", loginAdmin);

export default router;
