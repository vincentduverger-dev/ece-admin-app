import cors from "cors";
import express from "express";

import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import apiRouter from "./routes";

export const createApp = (): express.Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use("/api", apiRouter);

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "horizon-api"
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const app = createApp();
