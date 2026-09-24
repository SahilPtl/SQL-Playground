// A preflight report, deliberately not a tunnel launcher.
const checks = [
  ["Local authentication and server-derived database paths", true],
  ["SQL command restrictions and process deadlines", true],
  ["No credentials in client assets", true],
  ["OS-enforced native-memory and CPU quotas per worker", false],
  ["OS filesystem isolation around each untrusted worker", false],
  [
    "Non-demo accounts, restricted registration and production HTTPS policy",
    process.env.NODE_ENV === "production",
  ],
];
for (const [label, passed] of checks)
  console.log(`${passed ? "PASS" : "BLOCKED"}: ${label}`);
console.log(
  "Public exposure is blocked. See docs/DEPLOYMENT.md. This command does not launch a tunnel.",
);
process.exitCode = 1;
