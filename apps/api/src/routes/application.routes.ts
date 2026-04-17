import { Router } from "express";

import {
  getApplicationById,
  getApplications,
  updateApplicationPriority,
  updateApplicationStatus
} from "../controllers/application.controller";

const router = Router();

router.get("/applications", getApplications);
router.get("/applications/:id", getApplicationById);
router.patch("/applications/:id/status", updateApplicationStatus);
router.patch("/applications/:id/priority", updateApplicationPriority);

export default router;
