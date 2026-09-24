import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envFile = fileURLToPath(new URL("../.env", import.meta.url));
// Match the tested Google callback; run one checkout on these ports at a time.
const template = `# Local Google sign-in configuration. Never commit this file.
PORT=15001
FRONTEND_PORT=15174
CLIENT_URL=http://localhost:15174
SESSION_COOKIE_NAME=sql.google-side.sid
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:15001/api/auth/google/callback
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
`;
try {
  writeFileSync(envFile, template, { flag: "wx", mode: 0o600 });
  console.log("Created a private .env for local Google sign-in.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Existing .env preserved; no values were changed.");
}
console.log(
  "Open .env locally in VS Code and fill the Google client ID and secret.",
);
console.log("Instructions: docs/GOOGLE_SIGNIN_TRIAL.md");
console.log(
  "Then npm run dev. No credentials are printed or sent by this setup script.",
);
