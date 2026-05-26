import { app } from "./app";
import { config } from "./config/env";

app.listen(config.app.port, () => {
  console.log(`API running on http://localhost:${config.app.port}`);
});
