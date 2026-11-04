// AI response validators: check one raw answer from the model (classification or enrichment).
// Pure function, no I/O, no imports: this file is copied into an n8n Code node.
//
// Input:  the raw content string the model returned.
// Returns { ok: true, classification: { category, priority, confidence, reasoning } }
//      or  { ok: true, enrichment: { core_issue, identifiers, amounts, urgency_signal, outage_signal, summary } }
//      or  { ok: false, reason } with a short reason.

const CATEGORIES = ["Bug Report", "Feature Request", "Billing Issue", "Technical Question", "Incident/Outage"];

const PRIORITIES = ["High", "Medium", "Low"];

const URGENCY_SIGNALS = ["high", "medium", "low"];

// Parses the raw answer. Returns { answer } for a JSON object, or { reason } otherwise.
function parseObject(raw) {
  let answer;
  try {
    answer = JSON.parse(raw);
  } catch {
    return { reason: "answer is not valid JSON" };
  }
  if (answer === null || typeof answer !== "object" || Array.isArray(answer)) {
    return { reason: "answer is not a JSON object" };
  }
  return { answer };
}

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim() !== "";
const isNumberOrNull = (value) => value === null || (typeof value === "number" && Number.isFinite(value));

function validateClassification(raw) {
  const { answer, reason } = parseObject(raw);
  if (!answer) return { ok: false, reason };
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

function validateEnrichment(raw) {
  const { answer, reason } = parseObject(raw);
  if (!answer) return { ok: false, reason };
  if (!isText(answer.core_issue)) return { ok: false, reason: "core_issue is missing or empty" };
  if (!isText(answer.summary)) return { ok: false, reason: "summary is missing or empty" };
  if (!isPlainObject(answer.identifiers) || !Object.values(answer.identifiers).every((value) => typeof value === "string")) {
    return { ok: false, reason: "identifiers is not an object of text values" };
  }
  const amounts = answer.amounts;
  if (amounts !== null && !(isPlainObject(amounts) && isNumberOrNull(amounts.charged) && isNumberOrNull(amounts.expected))) {
    return { ok: false, reason: "amounts is not null or an object with charged and expected as numbers or null" };
  }
  if (!URGENCY_SIGNALS.includes(answer.urgency_signal)) return { ok: false, reason: "urgency_signal is not high, medium or low" };
  if (typeof answer.outage_signal !== "boolean") return { ok: false, reason: "outage_signal is not true or false" };
  return {
    ok: true,
    enrichment: {
      core_issue: answer.core_issue.trim(),
      identifiers: answer.identifiers,
      amounts: amounts === null ? null : { charged: amounts.charged, expected: amounts.expected },
      urgency_signal: answer.urgency_signal,
      outage_signal: answer.outage_signal,
      summary: answer.summary.trim(),
    },
  };
}

if (typeof module !== "undefined") module.exports = { validateClassification, validateEnrichment, CATEGORIES, PRIORITIES, URGENCY_SIGNALS };
