import { Router } from "express";

import { getApplications } from "../controllers/application.controller";

const router = Router();

router.get("/applications", getApplications);

export default router;
