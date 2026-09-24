import { readFileSync, rmSync } from "node:fs";
try {
  const { port, secret } = JSON.parse(
    readFileSync(".demo/control.json", "utf8"),
  );
  const response = await fetch(`http://127.0.0.1:${port}/stop`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) throw new Error("Controller rejected stop.");
  console.log("Demo stopped.");
} catch {
  console.log(
    "No active demo controller found. If a server was started separately, stop it in its terminal.",
  );
}
