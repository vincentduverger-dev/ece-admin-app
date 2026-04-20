import { Router } from "express";

import {
  getLevels,
  updateLevelAvailablePlaces
} from "../controllers/level.controller";

const router = Router();

router.get("/levels", getLevels);
router.patch("/levels/:id/available-places", updateLevelAvailablePlaces);

export default router;
