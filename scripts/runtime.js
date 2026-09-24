import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
// Local convenience for older system Node installations; never downloads code.
const fallback = path.join(
  homedir(),
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe",
);
const executable =
  Number(process.versions.node.split(".")[0]) >= 22
    ? process.execPath
    : existsSync(fallback)
      ? fallback
      : null;
if (!executable) {
  console.error(
    "Node.js 24 LTS is required. Install it, reopen PowerShell, run npm ci, then npm run demo.",
  );
  process.exit(1);
}
const child = spawn(executable, process.argv.slice(2), {
  stdio: "inherit",
  env: {
    ...process.env,
    PATH: path.dirname(executable) + path.delimiter + process.env.PATH,
  },
});
child.on("error", () => {
  console.error("Cannot launch Node. Install Node.js 24 LTS.");
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 1));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
