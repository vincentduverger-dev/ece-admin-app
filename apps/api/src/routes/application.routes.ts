import type { RequestHandler } from "express";
import { Router } from "express";
import multer from "multer";

import {
  getApplicationEmailLogs,
  getApplicationsReadyForEmail,
  updateApplicationDecision,
  getApplicationById,
  getApplications,
  sendApplicationEmail,
  updateApplicationContactEmail,
  updateStudentAdmissionStatus,
  updateApplicationPriority,
  updateApplicationStatus
} from "../controllers/application.controller";
import {
  getStudentById,
  getStudents,
  updateStudentPriority
} from "../controllers/student.controller";
import { badRequest } from "../lib/errors";

const router = Router();

const emailAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 8
  }
});

const uploadEmailAttachments: RequestHandler = (req, res, next) => {
  emailAttachmentUpload.array("attachments", 8)(req, res, (error) => {
    if (error) {
      next(badRequest("Pièce jointe refusée : taille ou nombre de fichiers invalide."));
      return;
    }

    next();
  });
};

router.get("/applications", getApplications);
router.get("/applications/ready-for-email", getApplicationsReadyForEmail);
router.get("/applications/:id", getApplicationById);
router.get("/applications/:id/email-logs", getApplicationEmailLogs);
router.patch("/applications/:id/status", updateApplicationStatus);
router.patch("/applications/:id/priority", updateApplicationPriority);
router.patch("/applications/:id/contact-email", updateApplicationContactEmail);
router.patch("/applications/:id/decision", updateApplicationDecision);
router.post("/applications/:id/send-email", uploadEmailAttachments, sendApplicationEmail);
router.get("/students", getStudents);
router.get("/students/:id", getStudentById);
router.patch("/students/:id/priority", updateStudentPriority);
router.patch("/students/:id/admission-status", updateStudentAdmissionStatus);

export default router;
