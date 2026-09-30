import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(
    JSON.stringify({
      message: "PadosiPro API listening",
      port: env.PORT,
      mail: `${env.SMTP_HOST}:${env.SMTP_PORT}`,
    }),
  );
});
