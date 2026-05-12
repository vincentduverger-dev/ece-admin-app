import { Router } from "express";

import {
  activateSchoolYear,
  createSchoolYear,
  deleteSchoolYear,
  getActiveSchoolYear,
  getSchoolYearLevelCapacities,
  getSchoolYears,
  updateSchoolYearLevelCapacities
} from "../controllers/school-year.controller";

const router = Router();

router.get("/school-years/active", getActiveSchoolYear);
router.get("/school-years", getSchoolYears);
router.post("/school-years", createSchoolYear);
router.get("/school-years/:id/level-capacities", getSchoolYearLevelCapacities);
router.put("/school-years/:id/level-capacities", updateSchoolYearLevelCapacities);
router.patch("/school-years/:id/activate", activateSchoolYear);
router.delete("/school-years/:id", deleteSchoolYear);

export default router;
