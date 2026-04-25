import { Router } from "express";

import {
  activateSchoolYear,
  createSchoolYear,
  getActiveSchoolYear,
  getSchoolYears
} from "../controllers/school-year.controller";

const router = Router();

router.get("/school-years/active", getActiveSchoolYear);
router.get("/school-years", getSchoolYears);
router.post("/school-years", createSchoolYear);
router.patch("/school-years/:id/activate", activateSchoolYear);

export default router;
