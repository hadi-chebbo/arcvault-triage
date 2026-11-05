const { test } = require("node:test");
const assert = require("node:assert/strict");
const { SCHEMA_FIELDS, checkRecord, callFailed, summarize } = require("../src/evaluate.js");

// A Triage Record that passes the default expectation; each test overrides only what it is about.
function record(overrides = {}) {
  const base = {
    id: "msg-test",
    source: "Email",
    received_at: "2026-01-01T00:00:00.000Z",
    message: "test",
    category: "Bug Report",
    priority: "Medium",
    confidence: 0.9,
    reasoning: "test",
    core_issue: "test",
    identifiers: {},
    amounts: null,
    urgency_signal: "medium",
    outage_signal: false,
    standard_queue: "Engineering",
    escalated: false,
    escalation_reasons: [],
    final_queue: "Engineering",
    summary: "test",
    model: "test-model",
    ai_errors: [],
  };
  return { ...base, ...overrides };
}

// An expectation that checks nothing; each test turns on only the rule it is about.
function expectation(overrides = {}) {
  return {
    categories: null,
    final_queue: null,
    escalated: null,
    required_reasons: [],
    forbidden_reasons: [],
    note: "test",
    ...overrides,
  };
}

test("the schema has the 20 Triage Record fields in spec order", () => {
  assert.equal(SCHEMA_FIELDS.length, 20);
  assert.deepEqual(Object.keys(record()), SCHEMA_FIELDS);
});

test("a matching record passes", () => {
  assert.deepEqual(checkRecord(record(), expectation()), { status: "pass", failures: [], falseEscalation: false });
});

test("a Category outside the list fails with a readable message", () => {
  const check = checkRecord(record({ category: "Feature Request" }), expectation({ categories: ["Technical Question"] }));
  assert.equal(check.status, "fail");
  assert.deepEqual(check.failures, ['category: got "Feature Request", expected Technical Question']);
});

test("any Category in the list passes", () => {
  const check = checkRecord(record(), expectation({ categories: ["Billing Issue", "Bug Report"] }));
  assert.equal(check.status, "pass");
});

test("null categories skips the Category check", () => {
  assert.equal(checkRecord(record({ category: "Anything" }), expectation()).status, "pass");
});

test("a null Category fails a Category check", () => {
  const check = checkRecord(record({ category: null }), expectation({ categories: ["Bug Report"] }));
  assert.deepEqual(check.failures, ['category: got null, expected Bug Report']);
});

test("final_queue as a string must be equal", () => {
  const check = checkRecord(record(), expectation({ final_queue: "Billing" }));
  assert.deepEqual(check.failures, ['final_queue: got "Engineering", expected Billing']);
});

test("final_queue as an array passes when it includes the Queue", () => {
  assert.equal(checkRecord(record(), expectation({ final_queue: ["Product", "Engineering"] })).status, "pass");
  assert.equal(checkRecord(record(), expectation({ final_queue: ["Product", "Billing"] })).status, "fail");
});

test("null final_queue skips the Queue check", () => {
  assert.equal(checkRecord(record({ final_queue: "Escalation" }), expectation()).status, "pass");
});

test("escalated must match when set, and is skipped when null", () => {
  const check = checkRecord(record({ escalated: true }), expectation({ escalated: false }));
  assert.deepEqual(check.failures, ["escalated: got true, expected false"]);
  assert.equal(checkRecord(record({ escalated: true }), expectation({ escalated: null })).status, "pass");
});

test("every required reason must be present", () => {
  const rec = record({ escalation_reasons: ["incident"] });
  const check = checkRecord(rec, expectation({ required_reasons: ["incident", "outage_signal"] }));
  assert.deepEqual(check.failures, ["escalation_reasons: missing outage_signal"]);
});

test("a forbidden reason fails", () => {
  const rec = record({ escalation_reasons: ["incident", "low_confidence"] });
  const check = checkRecord(rec, expectation({ forbidden_reasons: ["incident"] }));
  assert.deepEqual(check.failures, ["escalation_reasons: must not include incident"]);
});

test("several misses are all reported", () => {
  const check = checkRecord(record(), expectation({ categories: ["Billing Issue"], final_queue: "Billing" }));
  assert.equal(check.failures.length, 2);
});

test("a missing schema field fails", () => {
  const rec = record();
  delete rec.model;
  const check = checkRecord(rec, expectation());
  assert.equal(check.status, "fail");
  assert.deepEqual(check.failures, ["schema: missing field model"]);
});

test("an unexpected field fails", () => {
  const check = checkRecord({ ...record(), extra: 1 }, expectation());
  assert.equal(check.status, "fail");
  assert.deepEqual(check.failures, ["schema: unexpected field extra"]);
});

test("fields in the wrong order fail", () => {
  const { id, ...rest } = record();
  const check = checkRecord({ ...rest, id }, expectation());
  assert.equal(check.status, "fail");
  assert.deepEqual(check.failures, ["schema: field order differs"]);
});

test("non-object records fail without throwing", () => {
  for (const bad of [null, undefined, "oops", 42, [1, 2]]) {
    const check = checkRecord(bad, expectation({ escalated: false }));
    assert.equal(check.status, "fail");
    assert.deepEqual(check.failures, ["record is not an object"]);
    assert.equal(check.falseEscalation, false);
  }
});

test("a record with ai_errors is an ai_error, not a fail", () => {
  const rec = record({ category: null, escalated: true, ai_errors: ["classify: Groq 429"] });
  const check = checkRecord(rec, expectation({ escalated: false }));
  assert.equal(check.status, "ai_error");
  assert.deepEqual(check.failures, ["ai_errors: classify: Groq 429"]);
  assert.equal(check.falseEscalation, false);
});

test("schema failures are still reported on an ai_error record", () => {
  const rec = record({ ai_errors: ["classify: Groq 429"] });
  delete rec.summary;
  const check = checkRecord(rec, expectation());
  assert.equal(check.status, "ai_error");
  assert.deepEqual(check.failures, ["ai_errors: classify: Groq 429", "schema: missing field summary"]);
});

test("an empty ai_errors list is not an ai_error", () => {
  assert.equal(checkRecord(record({ ai_errors: [] }), expectation()).status, "pass");
});

test("an unexpected escalation is a false escalation", () => {
  const check = checkRecord(record({ escalated: true }), expectation({ escalated: false }));
  assert.equal(check.falseEscalation, true);
});

test("false escalation needs an expected escalated of exactly false", () => {
  assert.equal(checkRecord(record({ escalated: true }), expectation({ escalated: null })).falseEscalation, false);
  assert.equal(checkRecord(record({ escalated: true }), expectation({ escalated: true })).falseEscalation, false);
  assert.equal(checkRecord(record({ escalated: false }), expectation({ escalated: false })).falseEscalation, false);
});

test("a failed webhook call is a call_error, not a fail", () => {
  assert.deepEqual(callFailed("HTTP 500: boom"), {
    status: "call_error",
    failures: ["request failed: HTTP 500: boom"],
    falseEscalation: false,
  });
});

function result(id, run, rec, status = "pass", falseEscalation = false) {
  return { id, run, record: rec, check: { status, failures: [], falseEscalation } };
}

test("summarize counts statuses and false escalations", () => {
  const { totals } = summarize([
    result("a", 1, record(), "pass"),
    result("a", 2, record(), "fail", true),
    result("b", 1, record(), "ai_error"),
    result("b", 2, record(), "fail"),
    { id: "c", run: 1, record: null, check: callFailed("HTTP 500") },
  ]);
  assert.deepEqual(totals, { runs: 5, pass: 1, fail: 2, aiError: 1, callError: 1, falseEscalations: 1 });
});

test("summarize gives confidence spread, distinct categories and pass counts per sample", () => {
  const { samples } = summarize([
    result("a", 1, record({ confidence: 0.78, category: "Bug Report" })),
    result("a", 2, record({ confidence: 0.96, category: "Bug Report" }), "fail"),
    result("a", 3, record({ confidence: 0.75, category: "Feature Request" })),
    result("b", 1, record({ confidence: null, category: null }), "ai_error"),
    result("b", 2, null, "fail"),
  ]);
  assert.deepEqual(samples, [
    { id: "a", confidenceMin: 0.75, confidenceMax: 0.96, categories: ["Bug Report", "Feature Request"], passCount: 2, runCount: 3 },
    { id: "b", confidenceMin: null, confidenceMax: null, categories: [], passCount: 0, runCount: 2 },
  ]);
});

test("summarize of nothing is empty", () => {
  assert.deepEqual(summarize([]), {
    totals: { runs: 0, pass: 0, fail: 0, aiError: 0, callError: 0, falseEscalations: 0 },
    samples: [],
  });
});
