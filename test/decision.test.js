const { test } = require("node:test");
const assert = require("node:assert/strict");
const { decide } = require("../src/decision.js");

// Builds a decision input with sensible defaults; each test overrides only what it is about.
function input({ message = "Something is wrong.", classification = {}, enrichment = {} } = {}) {
  return {
    request: { id: "msg-test", source: "Email", message },
    classification: {
      category: "Bug Report",
      priority: "Medium",
      confidence: 0.9,
      reasoning: "test",
      ...classification,
    },
    enrichment: {
      core_issue: "test",
      identifiers: {},
      amounts: null,
      urgency_signal: "medium",
      summary: "test",
      ...enrichment,
    },
  };
}

test("a confident Bug Report goes to Engineering without escalation", () => {
  assert.deepEqual(decide(input()), {
    standard_queue: "Engineering",
    overcharge: null,
    escalated: false,
    escalation_reasons: [],
    final_queue: "Engineering",
  });
});

for (const [category, queue] of [
  ["Feature Request", "Product"],
  ["Billing Issue", "Billing"],
  ["Technical Question", "Customer Success"],
]) {
  test(`a confident ${category} goes to ${queue}`, () => {
    const result = decide(input({ classification: { category } }));
    assert.equal(result.standard_queue, queue);
    assert.equal(result.final_queue, queue);
    assert.equal(result.escalated, false);
  });
}

test("an Incident/Outage has Engineering (on-call) as its Standard Queue", () => {
  const result = decide(input({ classification: { category: "Incident/Outage" } }));
  assert.equal(result.standard_queue, "Engineering (on-call)");
});

test("Confidence of 0.69 escalates for low confidence and keeps the Standard Queue", () => {
  const result = decide(input({ classification: { category: "Technical Question", confidence: 0.69 } }));
  assert.equal(result.escalated, true);
  assert.deepEqual(result.escalation_reasons, ["low_confidence"]);
  assert.equal(result.final_queue, "Escalation");
  assert.equal(result.standard_queue, "Customer Success");
});

test("Confidence of exactly 0.70 does not escalate", () => {
  const result = decide(input({ classification: { confidence: 0.7 } }));
  assert.equal(result.escalated, false);
  assert.deepEqual(result.escalation_reasons, []);
});

test("every Incident/Outage escalates, even with high Confidence", () => {
  const result = decide(input({ classification: { category: "Incident/Outage", confidence: 0.98 } }));
  assert.deepEqual(result.escalation_reasons, ["incident"]);
  assert.equal(result.final_queue, "Escalation");
});

for (const message of [
  "We are seeing an OUTAGE in the EU region.",
  "The API has been down for an hour.",
  "This affects all users in our org.",
  "Multiple users can't log in.",
  "Reports stopped loading at noon.",
]) {
  test(`outage wording escalates a Bug Report: "${message}"`, () => {
    const result = decide(input({ message }));
    assert.deepEqual(result.escalation_reasons, ["outage_keywords"]);
    assert.equal(result.final_queue, "Escalation");
  });
}

test('"download" does not count as outage wording', () => {
  const result = decide(input({ message: "The CSV download button gives a blank file." }));
  assert.equal(result.escalated, false);
});

function billing(amounts) {
  return input({ classification: { category: "Billing Issue" }, enrichment: { amounts } });
}

test("sample #3: $1,240 charged against $980 is a $260 Overcharge and goes to Billing", () => {
  const result = decide(billing({ charged: 1240, expected: 980 }));
  assert.equal(result.overcharge, 260);
  assert.equal(result.escalated, false);
  assert.equal(result.final_queue, "Billing");
});

test("an Overcharge of $501 escalates", () => {
  const result = decide(billing({ charged: 1481, expected: 980 }));
  assert.equal(result.overcharge, 501);
  assert.deepEqual(result.escalation_reasons, ["overcharge_over_500"]);
  assert.equal(result.final_queue, "Escalation");
});

test("an Overcharge of exactly $500 does not escalate", () => {
  const result = decide(billing({ charged: 1480, expected: 980 }));
  assert.equal(result.overcharge, 500);
  assert.equal(result.escalated, false);
});

test("cents are kept exact: $1,000.10 against $500.00 is a $500.10 Overcharge and escalates", () => {
  const result = decide(billing({ charged: 1000.1, expected: 500 }));
  assert.equal(result.overcharge, 500.1);
  assert.deepEqual(result.escalation_reasons, ["overcharge_over_500"]);
});

for (const [label, amounts] of [
  ["no amounts", null],
  ["no expected amount", { charged: 2000 }],
  ["no charged amount", { expected: 980 }],
]) {
  test(`with ${label}, the Overcharge is null and the billing rule does not fire`, () => {
    const result = decide(billing(amounts));
    assert.equal(result.overcharge, null);
    assert.equal(result.escalated, false);
  });
}

test("a failed classification escalates with ai_failure and has no Standard Queue", () => {
  const result = decide({ ...input(), classification: { failed: true } });
  assert.equal(result.standard_queue, null);
  assert.deepEqual(result.escalation_reasons, ["ai_failure"]);
  assert.equal(result.final_queue, "Escalation");
});

test("a failed classification still records outage wording found in the Request", () => {
  const result = decide({ ...input({ message: "Total outage since 9am." }), classification: { failed: true } });
  assert.deepEqual(result.escalation_reasons, ["outage_keywords", "ai_failure"]);
});

test("a failed enrichment escalates with ai_failure but keeps the Standard Queue", () => {
  const result = decide({ ...input({ classification: { category: "Billing Issue" } }), enrichment: { failed: true } });
  assert.equal(result.standard_queue, "Billing");
  assert.equal(result.overcharge, null);
  assert.deepEqual(result.escalation_reasons, ["ai_failure"]);
  assert.equal(result.final_queue, "Escalation");
});

test("a Category outside the five escalates with ai_failure", () => {
  const result = decide(input({ classification: { category: "Spam" } }));
  assert.equal(result.standard_queue, null);
  assert.deepEqual(result.escalation_reasons, ["ai_failure"]);
  assert.equal(result.final_queue, "Escalation");
});

test("sample #5 shape: every reason that applies is recorded, in spec order", () => {
  const result = decide(
    input({
      message: "Your dashboard stopped loading for us around 2pm EST. Multiple users affected.",
      classification: { category: "Incident/Outage", confidence: 0.6 },
    })
  );
  assert.deepEqual(result.escalation_reasons, ["low_confidence", "incident", "outage_keywords"]);
});

test("outage wording split across a line break still escalates", () => {
  const result = decide(input({ message: "Since noon multiple\nusers see a blank page." }));
  assert.deepEqual(result.escalation_reasons, ["outage_keywords"]);
});

test('the plural "outages" counts as outage wording', () => {
  const result = decide(input({ message: "We keep having outages every morning." }));
  assert.deepEqual(result.escalation_reasons, ["outage_keywords"]);
});

for (const step of ["classification", "enrichment"]) {
  test(`a missing ${step} is treated as an AI failure instead of crashing`, () => {
    const result = decide({ ...input(), [step]: null });
    assert.ok(result.escalation_reasons.includes("ai_failure"));
    assert.equal(result.final_queue, "Escalation");
  });
}

for (const confidence of [undefined, "0.9", 1.5, -0.1]) {
  test(`a Confidence of ${JSON.stringify(confidence)} is treated as an AI failure`, () => {
    const result = decide(input({ classification: { confidence } }));
    assert.deepEqual(result.escalation_reasons, ["ai_failure"]);
    assert.equal(result.final_queue, "Escalation");
  });
}

test("reasons from every rule that can apply together are recorded in spec order", () => {
  const result = decide(
    input({
      message: "Total outage, and you overcharged us.",
      classification: { category: "Spam", confidence: 0.4 },
      enrichment: { amounts: { charged: 2000, expected: 980 } },
    })
  );
  assert.deepEqual(result.escalation_reasons, [
    "low_confidence",
    "outage_keywords",
    "overcharge_over_500",
    "ai_failure",
  ]);
});

test('a Category that matches a built-in name like "toString" is still unknown', () => {
  const result = decide(input({ classification: { category: "toString" } }));
  assert.equal(result.standard_queue, null);
  assert.deepEqual(result.escalation_reasons, ["ai_failure"]);
});
