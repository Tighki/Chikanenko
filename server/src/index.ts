import fs from "node:fs";
import { app } from "./app.js";
import { config } from "./config.js";

fs.mkdirSync(config.uploadDir, { recursive: true });

app.listen(config.port, () => {
  console.log(`API http://localhost:${config.port}`);
});
