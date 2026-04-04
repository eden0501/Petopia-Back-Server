import fs from "fs";
import https from "https";
import dotenv from "dotenv";

dotenv.config();

import initApp from "./server";

const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = NODE_ENV === "production" ? process.env.HTTPS_PORT : process.env.PORT || 3000;

initApp().then((app) => {
  let serverInstance;

  serverInstance =
    NODE_ENV === "production"
      ? https.createServer(
          {
            key: fs.readFileSync(process.env.HTTPS_KEY_PATH || ""),
            cert: fs.readFileSync(process.env.HTTPS_CERT_PATH || ""),
          },
          app,
        )
      : app;

  serverInstance.listen(PORT, () => {
    console.log(`Petopia Server listening on port: ${PORT}`);
  });
});
