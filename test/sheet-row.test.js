const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { toSheetRow } = require("../src/sheet-row.js");
const { SCHEMA_FIELDS } = require("../src/evaluate.js");

// A record with every field filled in; each test overrides only what it is about.
function record(overrides = {}) {
  return {
    id: "msg-test",
    source: "Email",
    received_at: "2026-11-04T17:50:53.059Z",
    message: "Something is wrong.",
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
    ...overrides,
  };
}

test("the row has exactly the schema fields, in spec order", () => {
  assert.deepEqual(Object.keys(toSheetRow(record())), SCHEMA_FIELDS);
});

test("the row keeps schema order even when the record's keys are shuffled", () => {
  const shuffled = Object.fromEntries(Object.entries(record()).reverse());
  assert.deepEqual(Object.keys(toSheetRow(shuffled)), SCHEMA_FIELDS);
});

test("strings, numbers and booleans are unchanged", () => {
  const row = toSheetRow(record({ confidence: 0.55, escalated: true, outage_signal: false }));
  assert.equal(row.message, "Something is wrong.");
  assert.equal(row.confidence, 0.55);
  assert.equal(row.escalated, true);
  assert.equal(row.outage_signal, false);
});

test("null and undefined become an empty cell", () => {
  const row = toSheetRow(record({ category: null, priority: undefined, summary: null, outage_signal: null }));
  assert.equal(row.category, "");
  assert.equal(row.priority, "");
  assert.equal(row.summary, "");
  assert.equal(row.outage_signal, "");
});

test("a missing field becomes an empty cell", () => {
  const { model, ...partial } = record();
  assert.equal(toSheetRow(partial).model, "");
});

test("identifiers are written as key: value pairs joined by semicolons", () => {
  const row = toSheetRow(record({ identifiers: { error_code: "403", account: "arcvault.io/user/jsmith" } }));
  assert.equal(row.identifiers, "error_code: 403; account: arcvault.io/user/jsmith");
});

test("empty or null identifiers are an empty cell", () => {
  assert.equal(toSheetRow(record({ identifiers: {} })).identifiers, "");
  assert.equal(toSheetRow(record({ identifiers: null })).identifiers, "");
});

test("amounts are written as labelled parts", () => {
  const row = toSheetRow(record({ amounts: { charged: 1240, expected: 980, overcharge: 260 } }));
  assert.equal(row.amounts, "charged: 1240; expected: 980; overcharge: 260");
});

test("amounts skip null parts", () => {
  const row = toSheetRow(record({ amounts: { charged: 1240, expected: null, overcharge: null } }));
  assert.equal(row.amounts, "charged: 1240");
});

test("null amounts are an empty cell", () => {
  assert.equal(toSheetRow(record({ amounts: null })).amounts, "");
});

test("escalation reasons are joined by commas", () => {
  const row = toSheetRow(record({ escalation_reasons: ["incident", "outage_signal"] }));
  assert.equal(row.escalation_reasons, "incident, outage_signal");
});

test("no escalation reasons is an empty cell", () => {
  assert.equal(toSheetRow(record({ escalation_reasons: [] })).escalation_reasons, "");
});

test("AI errors are joined by semicolons", () => {
  const row = toSheetRow(record({ ai_errors: ["classification: timeout", "enrichment: bad JSON"] }));
  assert.equal(row.ai_errors, "classification: timeout; enrichment: bad JSON");
});

test("no AI errors is an empty cell", () => {
  assert.equal(toSheetRow(record({ ai_errors: [] })).ai_errors, "");
});

test("any other object or array becomes JSON", () => {
  const row = toSheetRow(record({ core_issue: { a: 1 }, summary: [1, 2] }));
  assert.equal(row.core_issue, '{"a":1}');
  assert.equal(row.summary, "[1,2]");
});

test("a full escalated billing record becomes one readable row", () => {
  const billing = {
    id: "msg-003",
    source: "Support Portal",
    received_at: "2026-11-05T17:00:00.000Z",
    message: "Invoice #8821 shows a charge of $1,240 but our contract rate is $980/month.",
    category: "Billing Issue",
    priority: "Medium",
    confidence: 0.96,
    reasoning: "A billing dispute.",
    core_issue: "Charged more than the contract rate.",
    identifiers: { invoice_number: "8821" },
    amounts: { charged: 1240, expected: 980, overcharge: 260 },
    urgency_signal: "medium",
    outage_signal: false,
    standard_queue: "Billing",
    escalated: true,
    escalation_reasons: ["low_confidence", "overcharge_over_500"],
    final_queue: "Escalation",
    summary: "The customer disputes invoice 8821.",
    model: "openai/gpt-oss-120b",
    ai_errors: [],
  };
  assert.deepEqual(toSheetRow(billing), {
    ...billing,
    identifiers: "invoice_number: 8821",
    amounts: "charged: 1240; expected: 980; overcharge: 260",
    escalation_reasons: "low_confidence, overcharge_over_500",
    ai_errors: "",
  });
});

test("every saved sample record becomes a row of plain cell values", () => {
  const saved = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "output", "records.json"), "utf8"));
  for (const savedRecord of saved) {
    const row = toSheetRow(savedRecord);
    assert.deepEqual(Object.keys(row), SCHEMA_FIELDS);
    for (const value of Object.values(row)) assert.ok(["string", "number", "boolean"].includes(typeof value));
  }
});
