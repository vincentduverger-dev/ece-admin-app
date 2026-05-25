import { Router } from "express";

import { requireAdminAuth } from "../middlewares/admin-auth.middleware";
import applicationRoutes from "./application.routes";
import authRoutes from "./auth.routes";
import dashboardRoutes from "./dashboard.routes";
import importRoutes from "./import.routes";
import levelRoutes from "./level.routes";
import schoolYearRoutes from "./school-year.routes";

const apiRouter = Router();

apiRouter.use(authRoutes);
apiRouter.use(requireAdminAuth);
apiRouter.use(applicationRoutes);
apiRouter.use(dashboardRoutes);
apiRouter.use(importRoutes);
apiRouter.use(levelRoutes);
apiRouter.use(schoolYearRoutes);

export default apiRouter;
