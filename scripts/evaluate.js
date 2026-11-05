// Sends sample Requests to the n8n webhook several times and checks every Triage Record.
//   node scripts/evaluate.js [--set required|edge|all] [--runs N] [--only <id>]
// Defaults: set = all, runs = 3. Records are written to output/eval/<set>.json.
// A miss is a finding, not a crash: the exit code is 0 unless the input is bad.

const fs = require("node:fs");
const path = require("node:path");
const { postRequest, SPACING_MS } = require("./webhook.js");
const { checkRecord, callFailed, summarize } = require("../src/evaluate.js");

const SETS = { required: "samples/required.json", edge: "samples/edge-cases.json" };
const EXPECTATIONS = "samples/expectations.json";
const OUT_DIR = "output/eval";

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const options = { set: "all", runs: 3, only: null };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!["--set", "--runs", "--only"].includes(flag)) exitWithError(`Unknown argument "${flag}"`);
    if (value === undefined) exitWithError(`${flag} needs a value`);
    if (flag === "--set") options.set = value;
    if (flag === "--runs") options.runs = Number(value);
    if (flag === "--only") options.only = value;
  }
  if (options.set !== "all" && !SETS[options.set]) exitWithError(`Unknown set "${options.set}" (use required, edge or all)`);
  if (!Number.isInteger(options.runs) || options.runs < 1) exitWithError("--runs must be a whole number of at least 1");
  return options;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return exitWithError(`Could not read ${file}: ${error.message}`);
  }
}

const pad = (value, width) => String(value ?? "-").padEnd(width);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const STATUS_LABEL = { pass: "PASS", fail: "FAIL", ai_error: "AI ERROR", call_error: "CALL ERROR" };

// The result table: one column per entry, the header and every row share these widths.
const COLUMNS = [
  { title: "id", width: 9, value: ({ id }) => id },
  { title: "run", width: 4, value: ({ run }) => run },
  { title: "category", width: 18, value: ({ record }) => record.category },
  { title: "confidence", width: 11, value: ({ record }) => record.confidence },
  { title: "final_queue", width: 17, value: ({ record }) => record.final_queue },
  { title: "reasons", width: 30, value: ({ record }) => (record.escalation_reasons || []).join(",") || "-" },
  { title: "status", width: 11, value: ({ check }) => STATUS_LABEL[check.status] },
];

const header = () => [...COLUMNS.map((c) => pad(c.title, c.width)), "failures"].join(" ");

function row(result) {
  const record = result.record && typeof result.record === "object" ? result.record : {};
  const cells = COLUMNS.map((c) => pad(c.value({ ...result, record }), c.width));
  return [...cells, result.check.failures.join("; ")].join(" ");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const expectations = readJson(EXPECTATIONS);
  const setNames = options.set === "all" ? Object.keys(SETS) : [options.set];

  const sets = setNames.map((name) => {
    let samples = readJson(SETS[name]);
    if (options.only) samples = samples.filter((sample) => sample.id === options.only);
    for (const sample of samples) {
      if (!expectations[sample.id]) exitWithError(`No expectation for ${sample.id} in ${EXPECTATIONS}`);
    }
    return { name, samples, results: [] };
  });

  const active = sets.filter((set) => set.samples.length > 0);
  if (active.length === 0) exitWithError(options.only ? `No sample with id "${options.only}"` : "No samples to send");

  const total = active.reduce((sum, set) => sum + set.samples.length, 0) * options.runs;
  const minutes = ((total * SPACING_MS) / 60000).toFixed(1);
  console.log(`Sending ${total} Request(s), about ${minutes} minute(s) at ${SPACING_MS / 1000}s apart.\n`);
  console.log(header());

  let sent = 0;
  for (let run = 1; run <= options.runs; run++) {
    for (const set of active) {
      for (const sample of set.samples) {
        if (sent > 0) await sleep(SPACING_MS);
        sent += 1;
        let record = null;
        let callError = null;
        try {
          ({ record, error: callError } = await postRequest(sample));
        } catch (error) {
          callError = "could not reach the webhook: " + error.message;
        }
        // A failed call has no Triage Record to check, so report the call itself.
        const check = callError ? callFailed(callError) : checkRecord(record, expectations[sample.id]);
        const result = { id: sample.id, run, record, check };
        set.results.push(result);
        console.log(row(result));
      }
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const set of active) {
    const { totals, samples } = summarize(set.results);
    console.log(`\n== ${set.name} ==`);
    console.log(
      `${totals.pass} pass, ${totals.fail} fail, ${totals.aiError} AI errors, ${totals.callError} call errors, ` +
        `${totals.falseEscalations} false Escalations, out of ${totals.runs} runs`
    );
    for (const s of samples) {
      const spread = s.confidenceMin === null ? "n/a" : `${s.confidenceMin}-${s.confidenceMax}`;
      console.log(
        `${pad(s.id, 9)} confidence ${pad(spread, 11)} categories [${s.categories.join(", ")}] passes ${s.passCount}/${s.runCount}`
      );
    }
    const file = path.join(OUT_DIR, `${set.name}.json`);
    fs.writeFileSync(file, JSON.stringify(set.results, null, 2) + "\n");
    console.log(`Wrote ${set.results.length} result(s) to ${file}`);
  }
}

main().catch((error) => exitWithError("Evaluation failed: " + error.message));
