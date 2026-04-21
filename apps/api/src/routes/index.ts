import { Router } from "express";

import applicationRoutes from "./application.routes";
import dashboardRoutes from "./dashboard.routes";
import levelRoutes from "./level.routes";
import schoolYearRoutes from "./school-year.routes";

const apiRouter = Router();

apiRouter.use(applicationRoutes);
apiRouter.use(dashboardRoutes);
apiRouter.use(levelRoutes);
apiRouter.use(schoolYearRoutes);

export default apiRouter;
