// Shared Groq call with retries, used by the Classify and Enrich nodes.
// This file is not a node of its own: those two templates include it through a COPY block.
// It expects the including node to define the validator it passes in (see askGroq below).

const MODEL = "openai/gpt-oss-120b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_TRIES = 3; // the first try plus 2 retries
// Wait before retry 1 and retry 2. Groq's free tier allows 8,000 tokens per minute, and a 429 (rate limit)
// needs seconds, not milliseconds, to clear.
const RETRY_PAUSES_MS = [10000, 20000];

// Sleep helper; falls back to no pause if this sandbox has no timers.
const pause = (ms) => (typeof setTimeout === "function" ? new Promise((done) => setTimeout(done, ms)) : Promise.resolve());

// Asks Groq with a system prompt and a user message, and checks the answer with `validate`
// (validateClassification or validateEnrichment). Tries up to MAX_TRIES times.
// reasoningEffort is gpt-oss's thinking budget: "low", "medium" (the model's default) or "high".
// Returns { ok: true, value } with the checked answer, or { ok: false, error } with a short reason.
const askGroq = async (systemPrompt, userMessage, validate, reasoningEffort = "medium") => {
  let error = "no attempt was made";
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    if (attempt > 1) await pause(RETRY_PAUSES_MS[attempt - 2]);
    try {
      const response = await this.helpers.httpRequest({
        method: "POST",
        url: GROQ_URL,
        headers: { Authorization: "Bearer " + $env.GROQ_API_KEY },
        body: {
          model: MODEL,
          temperature: 0,
          reasoning_effort: reasoningEffort,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        },
        json: true,
        timeout: 30000,
      });
      const check = validate(response.choices[0].message.content);
      if (check.ok) return { ok: true, value: check.classification || check.enrichment };
      error = "rejected answer: " + check.reason;
    } catch (caught) {
      // Keep the reason short, and never let the API key leak into it.
      error = "API error: " + String(caught.message).replaceAll($env.GROQ_API_KEY, "***").slice(0, 120);
    }
  }
  return { ok: false, error };
};
