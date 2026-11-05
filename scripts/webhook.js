// The call to the n8n intake webhook, shared by the scripts that send Requests.

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:5678/webhook/intake";
// Pause between Requests. Each Request makes two Groq calls, and the free tier allows
// 8,000 tokens per minute, so sending back to back hits the rate limit (HTTP 429).
const SPACING_MS = 20000;

// Posts one Request. Resolves { status, record, error }: error is a short reason when the reply
// is not a Triage Record (an HTTP error, a body that isn't JSON, or JSON that isn't an object).
// Rejects on a network error.
async function postRequest(request) {
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const text = await response.text();
  let record = null;
  try {
    record = JSON.parse(text);
  } catch {
    return { status: response.status, record: null, error: `HTTP ${response.status}, not JSON: ${text.slice(0, 120)}` };
  }
  let error = null;
  if (response.status !== 200) error = `HTTP ${response.status}: ${text.slice(0, 120)}`;
  else if (record === null || typeof record !== "object" || Array.isArray(record)) error = "the reply is not a Triage Record";
  return { status: response.status, record, error };
}

module.exports = { postRequest, SPACING_MS };
