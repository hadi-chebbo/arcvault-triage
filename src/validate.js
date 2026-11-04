// AI response validator: checks one raw classification answer from the model.
// Pure function, no I/O, no imports: this file is copied into an n8n Code node.
//
// Input:  the raw content string the model returned.
// Returns { ok: true, classification: { category, priority, confidence, reasoning } }
//      or { ok: false, reason } with a short reason.

const CATEGORIES = ["Bug Report", "Feature Request", "Billing Issue", "Technical Question", "Incident/Outage"];

const PRIORITIES = ["High", "Medium", "Low"];

function validateClassification(raw) {
  let answer;
  try {
    answer = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "answer is not valid JSON" };
  }
  if (answer === null || typeof answer !== "object" || Array.isArray(answer)) {
    return { ok: false, reason: "answer is not a JSON object" };
  }
  if (!CATEGORIES.includes(answer.category)) {
    return { ok: false, reason: "category is not one of the five Categories" };
  }
  if (!PRIORITIES.includes(answer.priority)) {
    return { ok: false, reason: "priority is not High, Medium or Low" };
  }
  const confidence = answer.confidence;
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return { ok: false, reason: "confidence is not a number from 0 to 1" };
  }
  if (typeof answer.reasoning !== "string" || answer.reasoning.trim() === "") {
    return { ok: false, reason: "reasoning is missing or empty" };
  }
  return {
    ok: true,
    classification: { category: answer.category, priority: answer.priority, confidence: answer.confidence, reasoning: answer.reasoning.trim() },
  };
}

if (typeof module !== "undefined") module.exports = { validateClassification };
