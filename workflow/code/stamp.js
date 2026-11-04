// Stamp Request: checks the webhook body and adds id, source and received_at.
// An invalid body is flagged here; the workflow then answers HTTP 400 with the error.
const body = $input.first().json.body || {};
const SOURCES = ["Email", "Web Form", "Support Portal"];

// Replaced with the workflow's versionId by scripts/import-workflow.js. The 400 reply echoes it,
// so the import can tell when n8n is serving the version it just published.
const BUILD = "dev";

const invalid = (error) => [{ json: { invalid: true, error, build: BUILD } }];

if (typeof body.message !== "string") return invalid("message is required and must be a string");
if (body.message.trim() === "") return invalid("message must not be blank");
if (!SOURCES.includes(body.source)) return invalid("source must be one of: " + SOURCES.join(", "));

// The id from the sending system is kept when given (the samples use msg-001 … msg-005), so results can be
// matched to their Request. Otherwise one is generated. The Code node sandbox has no crypto global,
// so the generated id is a timestamp plus random letters.
const generatedId = "req-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
const id = typeof body.id === "string" && body.id.trim() !== "" ? body.id.trim() : generatedId;

// The message is stored exactly as the customer sent it.
return [{ json: { invalid: false, id, source: body.source, received_at: new Date().toISOString(), message: body.message } }];
