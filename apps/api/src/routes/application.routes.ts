import { Router } from "express";

import {
  getApplicationEmailLogs,
  getApplicationsReadyForEmail,
  updateApplicationDecision,
  getApplicationById,
  getApplications,
  sendApplicationEmail,
  updateStudentAdmissionStatus,
  updateApplicationPriority,
  updateApplicationStatus
} from "../controllers/application.controller";
import {
  getStudentById,
  getStudents,
  updateStudentPriority
} from "../controllers/student.controller";

const router = Router();

router.get("/applications", getApplications);
router.get("/applications/ready-for-email", getApplicationsReadyForEmail);
router.get("/applications/:id", getApplicationById);
router.get("/applications/:id/email-logs", getApplicationEmailLogs);
router.patch("/applications/:id/status", updateApplicationStatus);
router.patch("/applications/:id/priority", updateApplicationPriority);
router.patch("/applications/:id/decision", updateApplicationDecision);
router.post("/applications/:id/send-email", sendApplicationEmail);
router.get("/students", getStudents);
router.get("/students/:id", getStudentById);
router.patch("/students/:id/priority", updateStudentPriority);
router.patch("/students/:id/admission-status", updateStudentAdmissionStatus);

export default router;
