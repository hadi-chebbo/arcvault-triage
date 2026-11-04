// Posts Requests from a sample file to the n8n intake webhook, one at a time.
//   node scripts/send-samples.js [file] [--only <id>] [--out <path>]
// Defaults: file = samples/required.json, all Requests.
// The Triage Records are written as a JSON array to output/records.json (or --out <path>) when a whole
// file is sent. With --only, nothing is written unless --out is given.

const fs = require("node:fs");
const path = require("node:path");

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:5678/webhook/intake";
// Pause between Requests. Each Request makes two Groq calls, and the free tier allows
// 8,000 tokens per minute, so sending back to back hits the rate limit (HTTP 429).
const SPACING_MS = 20000;
const DEFAULT_OUT = "output/records.json";

const args = process.argv.slice(2);
const valueOf = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
const only = valueOf("--only");
const out = valueOf("--out") || (only ? null : DEFAULT_OUT);
const flagValues = [only, valueOf("--out")];
const file = args.find((arg) => !arg.startsWith("--") && !flagValues.includes(arg)) || "samples/required.json";

async function main() {
  let requests = JSON.parse(fs.readFileSync(file, "utf8"));
  if (only) requests = requests.filter((request) => request.id === only);
  if (requests.length === 0) {
    console.error(only ? `No Request with id "${only}" in ${file}` : `No Requests in ${file}`);
    process.exit(1);
  }

  const records = [];
  for (const [index, request] of requests.entries()) {
    if (index > 0) await new Promise((done) => setTimeout(done, SPACING_MS));
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const reply = await response.json();
    records.push(reply);
    console.log(
      `${request.id} (${request.source}) -> HTTP ${response.status}: ${reply.category ?? "no category"}, ` +
        `confidence ${reply.confidence ?? "n/a"}, final queue ${reply.final_queue ?? "n/a"}, ` +
        `escalation reasons [${(reply.escalation_reasons || []).join(", ")}]`
    );
  }

  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(records, null, 2) + "\n");
    console.log(`Wrote ${records.length} Triage Record(s) to ${out}`);
  }
}

main().catch((error) => {
  console.error("Could not reach the webhook: " + error.message);
  process.exit(1);
});
