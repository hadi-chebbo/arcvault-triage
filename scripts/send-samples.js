// Posts Requests from a sample file to the n8n intake webhook, one at a time.
//   node scripts/send-samples.js [file] [--only <id>] [--out <path>]
// Defaults: file = samples/required.json, all Requests.
// The Triage Records are written as a JSON array to output/records.json (or --out <path>) when a whole
// file is sent. With --only, nothing is written unless --out is given.

const fs = require("node:fs");
const path = require("node:path");
const { postRequest, SPACING_MS } = require("./webhook.js");

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
    const { status, record: reply, error } = await postRequest(request);
    // Never save an error reply as if it were a Triage Record.
    if (error) throw new Error(`${request.id}: ${error}`);
    records.push(reply);
    console.log(
      `${request.id} (${request.source}) -> HTTP ${status}: ${reply.category ?? "no category"}, ` +
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
  console.error("Sending failed: " + error.message);
  process.exit(1);
});
