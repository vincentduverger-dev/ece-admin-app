import type { RequestHandler } from "express";
import { Router } from "express";
import multer from "multer";

import { getCsvImportHistory, importCsv, previewCsvImport } from "../controllers/import.controller";
import { badRequest } from "../lib/errors";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const uploadCsvFile: RequestHandler = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      next(badRequest("Invalid CSV file upload"));
      return;
    }

    next();
  });
};

router.get("/import/csv/history", getCsvImportHistory);
router.post("/import/csv/preview", uploadCsvFile, previewCsvImport);
router.post("/import/csv", uploadCsvFile, importCsv);

export default router;
