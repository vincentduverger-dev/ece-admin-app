import "dotenv/config";
import cors from "cors";
import express from "express";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "ece-api"
  });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});