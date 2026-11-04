// Copies the source-of-truth files (prompts and pure modules) into the Code nodes of
// workflow/arcvault-triage.json.   node scripts/sync-workflow.js          write the copies
//                                  node scripts/sync-workflow.js --check  exit 1 if any copy is stale
//
// Each Code node's code lives in a template under workflow/code/. A template holds
// the node's own code plus COPY blocks:
//   // BEGIN COPY <file>
//   // END COPY <file>
// The sync fills each block with the current contents of <file>. A .md file becomes a
// JS string constant (prompts/classification.md -> CLASSIFICATION_PROMPT); a .js file is pasted as is.
// To add a node (ticket 03: enrichment prompt, src/decision.js), add a template and a line to CODE_NODES.

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const WORKFLOW = path.join(ROOT, "workflow", "arcvault-triage.json");

// Workflow node name -> template file.
const CODE_NODES = {
  "Stamp Request": "workflow/code/stamp.js",
  "Classify": "workflow/code/classify.js",
  "Build Response": "workflow/code/respond.js",
};

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

// "prompts/classification.md" -> "CLASSIFICATION_PROMPT"
function constName(file) {
  return path.basename(file, ".md").toUpperCase() + "_PROMPT";
}

function copyOf(file) {
  if (file.endsWith(".md")) return `const ${constName(file)} = ${JSON.stringify(read(file).trim())};`;
  return read(file).trim();
}

// Replaces what is between each BEGIN/END COPY pair with the current copy of its file.
function render(template) {
  const block = /^\/\/ BEGIN COPY (\S+)\n[\s\S]*?^\/\/ END COPY \1$/gm;
  return read(template).replace(block, (_, file) => `// BEGIN COPY ${file}\n${copyOf(file)}\n// END COPY ${file}`).trim();
}

const workflow = JSON.parse(fs.readFileSync(WORKFLOW, "utf8"));
const stale = [];

for (const [name, template] of Object.entries(CODE_NODES)) {
  const node = workflow.nodes.find((n) => n.name === name);
  if (!node) throw new Error(`workflow has no node named "${name}"`);
  const code = render(template);
  if (node.parameters.jsCode !== code) stale.push(name);
  node.parameters.jsCode = code;
}

if (process.argv.includes("--check")) {
  if (stale.length > 0) {
    console.error(`Out of date: ${stale.join(", ")}. Run: npm run sync`);
    process.exit(1);
  }
  console.log("Workflow copies are up to date.");
} else {
  fs.writeFileSync(WORKFLOW, JSON.stringify(workflow, null, 2) + "\n");
  console.log(stale.length > 0 ? `Updated: ${stale.join(", ")}` : "Nothing to update.");
}
