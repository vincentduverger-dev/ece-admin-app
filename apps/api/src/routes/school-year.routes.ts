import { Router } from "express";

import {
  getActiveSchoolYear,
  getSchoolYears
} from "../controllers/school-year.controller";

const router = Router();

router.get("/school-years/active", getActiveSchoolYear);
router.get("/school-years", getSchoolYears);

export default router;
