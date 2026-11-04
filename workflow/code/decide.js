// Decide: routing and escalation for one Request, using the tested decision module.
// The block marked COPY is written by scripts/sync-workflow.js. Do not edit it here.

// BEGIN COPY src/decision.js
// END COPY src/decision.js

const item = $input.first().json;
const decision = decide({
  request: { message: item.message },
  classification: item.classification,
  enrichment: item.enrichment,
});

return [{ json: { ...item, decision } }];
