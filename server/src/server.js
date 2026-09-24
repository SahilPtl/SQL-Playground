import { app } from "./app.js";
import { config } from "./config.js";
import { ensureDemoUser } from "./auth.js";
import { appDb } from "./database.js";
await ensureDemoUser();
// Recover an interrupted grading operation without leaving a stuck attempt.
appDb
  .prepare(
    "UPDATE interview_attempts SET status='failed' WHERE status='grading'",
  )
  .run();
const server = app.listen(config.port, "127.0.0.1", () =>
  console.log(`SQL Playground API ready at http://localhost:${config.port}`),
);
server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `Port ${config.port} is occupied. Stop the existing demo with npm run stop, or close the other application.`
      : "Server failed to start. Check configuration.",
  );
  process.exit(1);
});
function stop() {
  server.close(() => {
    appDb.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
