import { Router } from "express";

import {
  getApplicationById,
  getApplications
} from "../controllers/application.controller";

const router = Router();

router.get("/applications", getApplications);
router.get("/applications/:id", getApplicationById);

export default router;
