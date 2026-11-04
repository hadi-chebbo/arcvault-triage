// Posts Requests from a sample file to the n8n intake webhook, one at a time, and prints each reply.
//   node scripts/send-samples.js [file] [--only <id>]
// Defaults: file = samples/required.json, all Requests.

const fs = require("node:fs");

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:5678/webhook/intake";

const args = process.argv.slice(2);
const onlyIndex = args.indexOf("--only");
const only = onlyIndex === -1 ? null : args[onlyIndex + 1];
const file = args.find((arg, i) => !arg.startsWith("--") && i !== onlyIndex + 1) || "samples/required.json";

async function main() {
  let requests = JSON.parse(fs.readFileSync(file, "utf8"));
  if (only) requests = requests.filter((request) => request.id === only);
  if (requests.length === 0) {
    console.error(only ? `No Request with id "${only}" in ${file}` : `No Requests in ${file}`);
    process.exit(1);
  }

  for (const request of requests) {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const reply = await response.json();
    console.log(`--- ${request.id} (${request.source}) -> HTTP ${response.status}`);
    console.log(JSON.stringify(reply, null, 2));
  }
}

main().catch((error) => {
  console.error("Could not reach the webhook: " + error.message);
  process.exit(1);
});
