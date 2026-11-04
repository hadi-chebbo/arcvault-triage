// Classify: asks Groq for a Category, Priority and Confidence, then validates the answer.
// The two blocks marked COPY are written by scripts/sync-workflow.js. Do not edit them here.

// BEGIN COPY prompts/classification.md
// END COPY prompts/classification.md

// BEGIN COPY src/validate.js
// END COPY src/validate.js

const MODEL = "openai/gpt-oss-120b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_TRIES = 3; // the first try plus 2 retries

const request = $input.first().json;

// One call to Groq. Returns the raw content string of the model's answer.
const askModel = async () => {
  const response = await this.helpers.httpRequest({
    method: "POST",
    url: GROQ_URL,
    headers: { Authorization: "Bearer " + $env.GROQ_API_KEY },
    body: {
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CLASSIFICATION_PROMPT },
        { role: "user", content: request.message },
      ],
    },
    json: true,
    timeout: 30000,
  });
  return response.choices[0].message.content;
};

let classification = { failed: true, error: "no attempt was made" };
for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
  try {
    const result = validateClassification(await askModel());
    if (result.ok) {
      classification = result.classification;
      break;
    }
    classification = { failed: true, error: "rejected answer: " + result.reason };
  } catch (error) {
    // Keep the reason short, and never let the API key leak into it.
    const reason = String(error.message).replaceAll($env.GROQ_API_KEY, "***").slice(0, 120);
    classification = { failed: true, error: "API error: " + reason };
  }
}

return [{ json: { ...request, classification, model: MODEL } }];
