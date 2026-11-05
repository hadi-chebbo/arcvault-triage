// Checks Triage Records against expectations and summarizes repeated runs. Pure: no I/O.

const SCHEMA_FIELDS = [
  "id",
  "source",
  "received_at",
  "message",
  "category",
  "priority",
  "confidence",
  "reasoning",
  "core_issue",
  "identifiers",
  "amounts",
  "urgency_signal",
  "outage_signal",
  "standard_queue",
  "escalated",
  "escalation_reasons",
  "final_queue",
  "summary",
  "model",
  "ai_errors",
];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function schemaFailures(record) {
  const keys = Object.keys(record);
  const failures = [];
  for (const field of SCHEMA_FIELDS) if (!keys.includes(field)) failures.push(`schema: missing field ${field}`);
  for (const key of keys) if (!SCHEMA_FIELDS.includes(key)) failures.push(`schema: unexpected field ${key}`);
  // Only meaningful when the same fields are present.
  if (failures.length === 0 && keys.some((key, i) => key !== SCHEMA_FIELDS[i])) {
    failures.push("schema: field order differs");
  }
  return failures;
}

function expectationFailures(record, expectation) {
  const failures = [];
  const { categories, final_queue, escalated, required_reasons = [], forbidden_reasons = [] } = expectation;

  if (categories && !categories.includes(record.category)) {
    failures.push(`category: got ${JSON.stringify(record.category)}, expected ${categories.join(" or ")}`);
  }

  if (final_queue !== null && final_queue !== undefined) {
    const accepted = Array.isArray(final_queue) ? final_queue : [final_queue];
    if (!accepted.includes(record.final_queue)) {
      failures.push(`final_queue: got ${JSON.stringify(record.final_queue)}, expected ${accepted.join(" or ")}`);
    }
  }

  if (escalated !== null && escalated !== undefined && record.escalated !== escalated) {
    failures.push(`escalated: got ${record.escalated}, expected ${escalated}`);
  }

  const reasons = Array.isArray(record.escalation_reasons) ? record.escalation_reasons : [];
  for (const reason of required_reasons) {
    if (!reasons.includes(reason)) failures.push(`escalation_reasons: missing ${reason}`);
  }
  for (const reason of forbidden_reasons) {
    if (reasons.includes(reason)) failures.push(`escalation_reasons: must not include ${reason}`);
  }
  return failures;
}

function checkRecord(record, expectation) {
  if (!isObject(record)) {
    return { status: "fail", failures: ["record is not an object"], falseEscalation: false };
  }

  const aiErrors = Array.isArray(record.ai_errors) ? record.ai_errors : [];
  if (aiErrors.length > 0) {
    // An infrastructure failure, not a misclassification: report it, still check the schema.
    return {
      status: "ai_error",
      failures: [...aiErrors.map((error) => `ai_errors: ${error}`), ...schemaFailures(record)],
      falseEscalation: false,
    };
  }

  const failures = [...schemaFailures(record), ...expectationFailures(record, expectation)];
  return {
    status: failures.length === 0 ? "pass" : "fail",
    failures,
    falseEscalation: expectation.escalated === false && record.escalated === true,
  };
}

// The check result for a webhook call that returned no Triage Record (network error, HTTP error,
// a body that isn't a record). Like an AI error, it is counted apart from misclassifications.
function callFailed(message) {
  return { status: "call_error", failures: [`request failed: ${message}`], falseEscalation: false };
}

// results: [{ id, run, record, check }]
function summarize(results) {
  const totals = { runs: 0, pass: 0, fail: 0, aiError: 0, callError: 0, falseEscalations: 0 };
  const bySample = new Map();

  for (const { id, record, check } of results) {
    totals.runs += 1;
    if (check.status === "pass") totals.pass += 1;
    else if (check.status === "ai_error") totals.aiError += 1;
    else if (check.status === "call_error") totals.callError += 1;
    else totals.fail += 1;
    if (check.falseEscalation) totals.falseEscalations += 1;

    if (!bySample.has(id)) bySample.set(id, { id, confidences: [], categories: [], passCount: 0, runCount: 0 });
    const sample = bySample.get(id);
    sample.runCount += 1;
    if (check.status === "pass") sample.passCount += 1;
    if (isObject(record)) {
      if (typeof record.confidence === "number") sample.confidences.push(record.confidence);
      if (record.category != null && !sample.categories.includes(record.category)) sample.categories.push(record.category);
    }
  }

  const samples = [...bySample.values()].map(({ id, confidences, categories, passCount, runCount }) => ({
    id,
    confidenceMin: confidences.length ? Math.min(...confidences) : null,
    confidenceMax: confidences.length ? Math.max(...confidences) : null,
    categories,
    passCount,
    runCount,
  }));
  return { totals, samples };
}

module.exports = { SCHEMA_FIELDS, checkRecord, callFailed, summarize };
