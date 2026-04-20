import { Router } from "express";

import {
  getApplicationEmailLogs,
  updateApplicationDecision,
  getApplicationById,
  getApplications,
  sendApplicationEmail,
  updateApplicationPriority,
  updateApplicationStatus
} from "../controllers/application.controller";

const router = Router();

router.get("/applications", getApplications);
router.get("/applications/:id", getApplicationById);
router.get("/applications/:id/email-logs", getApplicationEmailLogs);
router.patch("/applications/:id/status", updateApplicationStatus);
router.patch("/applications/:id/priority", updateApplicationPriority);
router.patch("/applications/:id/decision", updateApplicationDecision);
router.post("/applications/:id/send-email", sendApplicationEmail);

export default router;
