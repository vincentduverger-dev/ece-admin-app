import { Router } from "express";

import { getSchoolYears } from "../controllers/school-year.controller";

const router = Router();

router.get("/school-years", getSchoolYears);

export default router;
