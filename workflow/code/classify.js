// Classify: asks Groq for a Category, Priority and Confidence, then validates the answer.
// The two blocks marked COPY are written by scripts/sync-workflow.js. Do not edit them here.

// BEGIN COPY prompts/classification.md
// END COPY prompts/classification.md

// BEGIN COPY src/validate.js
// END COPY src/validate.js

const MODEL = "openai/gpt-oss-120b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_TRIES = 3; // the first try plus 2 retries
const RETRY_PAUSES_MS = [1000, 3000]; // wait before retry 1 and retry 2, so a rate limit can clear

// Sleep helper; falls back to no pause if this sandbox has no timers.
const pause = (ms) => (typeof setTimeout === "function" ? new Promise((done) => setTimeout(done, ms)) : Promise.resolve());

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
    timeout: 20000,
  });
  return response.choices[0].message.content;
};

let classification = { failed: true, error: "no attempt was made" };
for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
  if (attempt > 1) await pause(RETRY_PAUSES_MS[attempt - 2]);
  try {
    const check = validateClassification(await askModel());
    if (check.ok) {
      classification = check.classification;
      break;
    }
    classification = { failed: true, error: "rejected answer: " + check.reason };
  } catch (error) {
    // Keep the reason short, and never let the API key leak into it.
    const reason = String(error.message).replaceAll($env.GROQ_API_KEY, "***").slice(0, 120);
    classification = { failed: true, error: "API error: " + reason };
  }
}

return [{ json: { ...request, classification, model: MODEL } }];
