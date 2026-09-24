import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const root = fileURLToPath(new URL("../../", import.meta.url));
export const config = {
  dataDir: path.resolve(process.env.DATA_DIR || path.join(root, "server/data")),
  production: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "sql.sid",
  googleId: process.env.GOOGLE_CLIENT_ID?.trim(),
  googleSecret: process.env.GOOGLE_CLIENT_SECRET?.trim(),
  googleCallback: process.env.GOOGLE_CALLBACK_URL?.trim(),
  openaiKey: process.env.OPENAI_API_KEY?.trim(),
  openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
};
export const googleEnabled = Boolean(
  config.googleId &&
  config.googleSecret &&
  config.googleCallback &&
  /^https?:\/\//.test(config.googleCallback),
);
