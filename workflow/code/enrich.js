// Enrich: asks Groq for the Core Issue, Identifiers, amounts, Urgency Signal, Outage Signal and Summary.
// It always runs, even when classification failed, so a human still gets a Summary.
// The blocks marked COPY are written by scripts/sync-workflow.js. Do not edit them here.

// BEGIN COPY prompts/enrichment.md
// END COPY prompts/enrichment.md

// BEGIN COPY src/validate.js
// END COPY src/validate.js

// BEGIN COPY workflow/code/groq.js
// END COPY workflow/code/groq.js

const item = $input.first().json;
const category = item.classification.failed ? "unknown" : item.classification.category;

// The Request and Category are delimited so the model can tell data from instructions.
const userMessage = `<category>${category}</category>\n<request>\n${item.message}\n</request>`;

const answer = await askGroq(ENRICHMENT_PROMPT, userMessage, validateEnrichment);
const enrichment = answer.ok ? answer.value : { failed: true, error: answer.error };

return [{ json: { ...item, enrichment } }];
