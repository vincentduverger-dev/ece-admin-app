import { Router } from "express";

import { getLevels } from "../controllers/level.controller";

const router = Router();

router.get("/levels", getLevels);

export default router;
