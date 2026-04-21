import cors from "cors";
import express from "express";

import { config } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import apiRouter from "./routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", apiRouter);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "ece-api"
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.app.port, () => {
  console.log(`API running on http://localhost:${config.app.port}`);
});
