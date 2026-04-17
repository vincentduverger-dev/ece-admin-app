import { Router } from "express";

import {
  getApplicationById,
  getApplications,
  updateApplicationStatus
} from "../controllers/application.controller";

const router = Router();

router.get("/applications", getApplications);
router.get("/applications/:id", getApplicationById);
router.patch("/applications/:id/status", updateApplicationStatus);

export default router;
