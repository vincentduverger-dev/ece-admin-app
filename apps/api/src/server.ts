import "dotenv/config";
import cors from "cors";
import express from "express";

import applicationRoutes from "./routes/application.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import levelRoutes from "./routes/level.routes";
import schoolYearRoutes from "./routes/school-year.routes";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use("/api", applicationRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", levelRoutes);
app.use("/api", schoolYearRoutes);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "ece-api"
  });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
