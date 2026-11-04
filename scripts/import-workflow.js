// Imports workflow/arcvault-triage.json into the running n8n container and publishes it.
// n8n only registers the webhook after a restart, so the container is restarted at the end.
//
// Each import gets a fresh versionId. Without one, n8n reuses the previous version's id and
// publish:workflow keeps serving the old snapshot of the nodes, so code changes never go live.

const { execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const CONTAINER = "arcvault-n8n";
const WORKFLOW_ID = "arcvaulttriage01"; // the "id" field inside the workflow JSON

function run(command, args) {
  console.log("$ " + [command, ...args].join(" "));
  execFileSync(command, args, { stdio: "inherit" });
}

run("node", ["scripts/sync-workflow.js", "--check"]); // never import stale copies
const workflow = JSON.parse(fs.readFileSync("workflow/arcvault-triage.json", "utf8"));
workflow.versionId = crypto.randomUUID();
const importFile = path.join(os.tmpdir(), "arcvault-triage-import.json");
fs.writeFileSync(importFile, JSON.stringify(workflow, null, 2));
run("docker", ["cp", importFile, `${CONTAINER}:/tmp/arcvault-triage.json`]);
run("docker", ["exec", CONTAINER, "n8n", "import:workflow", "--input=/tmp/arcvault-triage.json"]);
run("docker", ["exec", CONTAINER, "n8n", "publish:workflow", `--id=${WORKFLOW_ID}`]);
run("docker", ["restart", CONTAINER]);
console.log("Imported and published. n8n needs a few seconds to start; then run: npm run send");
