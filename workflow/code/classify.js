// Classify: asks Groq for a Category, Priority and Confidence, then validates the answer.
// The blocks marked COPY are written by scripts/sync-workflow.js. Do not edit them here.

// BEGIN COPY prompts/classification.md
// END COPY prompts/classification.md

// BEGIN COPY src/validate.js
// END COPY src/validate.js

// BEGIN COPY workflow/code/groq.js
// END COPY workflow/code/groq.js

const request = $input.first().json;

const answer = await askGroq(CLASSIFICATION_PROMPT, request.message, validateClassification);
const classification = answer.ok ? answer.value : { failed: true, error: answer.error };

return [{ json: { ...request, classification, model: MODEL } }];
