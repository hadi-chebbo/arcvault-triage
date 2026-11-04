// Stamp Request: checks the webhook body and adds id, source and received_at.
// A blank or missing message is flagged here; the workflow then answers HTTP 400.
const body = $input.first().json.body || {};

const message = typeof body.message === "string" ? body.message.trim() : "";
if (message === "") {
  return [{ json: { invalid: true, error: "message is required and must not be blank" } }];
}

// The Code node sandbox has no crypto global, so the generated id is a timestamp plus random letters.
const generatedId = "req-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
const id = typeof body.id === "string" && body.id.trim() !== "" ? body.id.trim() : generatedId;
const source = typeof body.source === "string" && body.source.trim() !== "" ? body.source.trim() : "Unknown";

return [{ json: { invalid: false, id, source, received_at: new Date().toISOString(), message } }];
