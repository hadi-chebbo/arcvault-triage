// Imports workflow/arcvault-triage.json into the running n8n container and publishes it.
// n8n only registers the webhook after a restart, so the container is restarted at the end.

const { execFileSync } = require("node:child_process");

const CONTAINER = "arcvault-n8n";
const WORKFLOW_ID = "arcvaulttriage01"; // the "id" field inside the workflow JSON

function run(command, args) {
  console.log("$ " + [command, ...args].join(" "));
  execFileSync(command, args, { stdio: "inherit" });
}

run("node", ["scripts/sync-workflow.js", "--check"]); // never import stale copies
run("docker", ["cp", "workflow/arcvault-triage.json", `${CONTAINER}:/tmp/arcvault-triage.json`]);
run("docker", ["exec", CONTAINER, "n8n", "import:workflow", "--input=/tmp/arcvault-triage.json"]);
run("docker", ["exec", CONTAINER, "n8n", "publish:workflow", `--id=${WORKFLOW_ID}`]);
run("docker", ["restart", CONTAINER]);
console.log("Imported and published. n8n needs a few seconds to start; then run: npm run send");
