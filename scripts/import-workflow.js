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
const stamp = workflow.nodes.find((node) => node.name === "Stamp Request");
stamp.parameters.jsCode = stamp.parameters.jsCode.replace('const BUILD = "dev";', `const BUILD = "${workflow.versionId}";`);
const importFile = path.join(os.tmpdir(), "arcvault-triage-import.json");
fs.writeFileSync(importFile, JSON.stringify(workflow, null, 2));
run("docker", ["cp", importFile, `${CONTAINER}:/tmp/arcvault-triage.json`]);
run("docker", ["exec", CONTAINER, "n8n", "import:workflow", "--input=/tmp/arcvault-triage.json"]);
run("docker", ["exec", CONTAINER, "n8n", "publish:workflow", `--id=${WORKFLOW_ID}`]);
run("docker", ["restart", CONTAINER]);
// Wait until the webhook is served by the version just imported. An empty body is rejected with
// HTTP 400 before any AI call, so this costs nothing, and the reply carries the build id.
// Right after a restart n8n can briefly answer with the previous version, so "it answers" is not enough.
async function waitForWebhook() {
  for (let second = 0; second < 60; second++) {
    try {
      const response = await fetch("http://localhost:5678/webhook/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (response.status === 400 && (await response.json()).build === workflow.versionId) return true;
    } catch {
      // n8n is not accepting connections yet
    }
    await new Promise((done) => setTimeout(done, 1000));
  }
  return false;
}

waitForWebhook().then((ready) => {
  if (!ready) {
    console.error("n8n did not serve the new version within 60 seconds. Check: docker logs arcvault-n8n");
    process.exit(1);
  }
  console.log("Imported, published, and the new version is live. Run: npm run send");
});
