const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateClassification, validateEnrichment, URGENCY_SIGNALS } = require("../src/validate.js");

// A good model answer as the raw content string; each test overrides only what it is about.
function answer(overrides = {}) {
  return JSON.stringify({
    category: "Bug Report",
    priority: "Medium",
    confidence: 0.95,
    reasoning: "One user gets a 403 error after an update.",
    ...overrides,
  });
}

test("a good answer is accepted and returned as a classification", () => {
  assert.deepEqual(validateClassification(answer()), {
    ok: true,
    classification: {
      category: "Bug Report",
      priority: "Medium",
      confidence: 0.95,
      reasoning: "One user gets a 403 error after an update.",
    },
  });
});

test("an answer that is not JSON is rejected", () => {
  assert.deepEqual(validateClassification("Sure! The category is Bug Report."), {
    ok: false,
    reason: "answer is not valid JSON",
  });
});

test("a Category outside the five is rejected", () => {
  assert.deepEqual(validateClassification(answer({ category: "Complaint" })), {
    ok: false,
    reason: "category is not one of the five Categories",
  });
});

test("a Category with different spelling or case is rejected", () => {
  assert.deepEqual(validateClassification(answer({ category: "bug report" })), {
    ok: false,
    reason: "category is not one of the five Categories",
  });
});

test("valid JSON that is not an object is rejected", () => {
  assert.deepEqual(validateClassification("null"), { ok: false, reason: "answer is not a JSON object" });
  assert.deepEqual(validateClassification("[1, 2]"), { ok: false, reason: "answer is not a JSON object" });
});

test("a Priority outside High, Medium, Low is rejected", () => {
  assert.deepEqual(validateClassification(answer({ priority: "Urgent" })), {
    ok: false,
    reason: "priority is not High, Medium or Low",
  });
});

test("a missing Priority is rejected", () => {
  assert.deepEqual(validateClassification(answer({ priority: undefined })), {
    ok: false,
    reason: "priority is not High, Medium or Low",
  });
});

const BAD_CONFIDENCE = "confidence is not a number from 0 to 1";

test("a missing, null or text Confidence is rejected", () => {
  assert.deepEqual(validateClassification(answer({ confidence: undefined })), { ok: false, reason: BAD_CONFIDENCE });
  assert.deepEqual(validateClassification(answer({ confidence: null })), { ok: false, reason: BAD_CONFIDENCE });
  assert.deepEqual(validateClassification(answer({ confidence: "0.9" })), { ok: false, reason: BAD_CONFIDENCE });
});

test("a Confidence outside 0 to 1 is rejected", () => {
  assert.deepEqual(validateClassification(answer({ confidence: 1.2 })), { ok: false, reason: BAD_CONFIDENCE });
  assert.deepEqual(validateClassification(answer({ confidence: -0.1 })), { ok: false, reason: BAD_CONFIDENCE });
});

test("a Confidence of exactly 0 or exactly 1 is accepted", () => {
  assert.equal(validateClassification(answer({ confidence: 0 })).ok, true);
  assert.equal(validateClassification(answer({ confidence: 1 })).ok, true);
});

test("a missing, empty, blank or non-text reasoning is rejected", () => {
  const bad = { ok: false, reason: "reasoning is missing or empty" };
  assert.deepEqual(validateClassification(answer({ reasoning: undefined })), bad);
  assert.deepEqual(validateClassification(answer({ reasoning: "" })), bad);
  assert.deepEqual(validateClassification(answer({ reasoning: "   " })), bad);
  assert.deepEqual(validateClassification(answer({ reasoning: 42 })), bad);
});

test("the classification prompt names every Category and Priority the validator accepts", () => {
  const { CATEGORIES, PRIORITIES } = require("../src/validate.js");
  const prompt = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "prompts", "classification.md"), "utf8");
  assert.deepEqual(CATEGORIES, ["Bug Report", "Feature Request", "Billing Issue", "Technical Question", "Incident/Outage"]);
  assert.deepEqual(PRIORITIES, ["High", "Medium", "Low"]);
  for (const name of [...CATEGORIES, ...PRIORITIES]) assert.ok(prompt.includes(name), `prompt does not mention "${name}"`);
});

// A good enrichment answer as the raw content string; each test overrides only what it is about.
function enrichmentAnswer(overrides = {}) {
  return JSON.stringify({
    core_issue: "Invoice INV-2291 was charged $1,240 instead of $980.",
    identifiers: { invoice_number: "INV-2291" },
    amounts: { charged: 1240, expected: 980 },
    urgency_signal: "medium",
    outage_signal: false,
    summary: "The customer disputes invoice INV-2291. They were charged 1240 but expected 980.",
    ...overrides,
  });
}

test("a good enrichment answer is accepted and returned as an enrichment", () => {
  assert.deepEqual(validateEnrichment(enrichmentAnswer()), {
    ok: true,
    enrichment: {
      core_issue: "Invoice INV-2291 was charged $1,240 instead of $980.",
      identifiers: { invoice_number: "INV-2291" },
      amounts: { charged: 1240, expected: 980 },
      urgency_signal: "medium",
      outage_signal: false,
      summary: "The customer disputes invoice INV-2291. They were charged 1240 but expected 980.",
    },
  });
});

test("an enrichment with no Identifiers and no amounts is accepted", () => {
  const check = validateEnrichment(enrichmentAnswer({ identifiers: {}, amounts: null }));
  assert.equal(check.ok, true);
  assert.deepEqual(check.enrichment.identifiers, {});
  assert.equal(check.enrichment.amounts, null);
});

test("an amounts object with one amount null is accepted", () => {
  const check = validateEnrichment(enrichmentAnswer({ amounts: { charged: 1240, expected: null } }));
  assert.equal(check.ok, true);
  assert.deepEqual(check.enrichment.amounts, { charged: 1240, expected: null });
});

test("an enrichment answer that is not JSON is rejected", () => {
  assert.deepEqual(validateEnrichment("Here you go: {}"), { ok: false, reason: "answer is not valid JSON" });
});

test("an enrichment answer that is not an object is rejected", () => {
  assert.deepEqual(validateEnrichment("[1, 2]"), { ok: false, reason: "answer is not a JSON object" });
  assert.deepEqual(validateEnrichment("null"), { ok: false, reason: "answer is not a JSON object" });
});

test("an empty, blank, missing or non-text core_issue is rejected", () => {
  for (const core_issue of ["", "   ", undefined, 5]) {
    assert.deepEqual(validateEnrichment(enrichmentAnswer({ core_issue })), { ok: false, reason: "core_issue is missing or empty" });
  }
});

test("an empty, blank, missing or non-text summary is rejected", () => {
  for (const summary of ["", "   ", undefined, null]) {
    assert.deepEqual(validateEnrichment(enrichmentAnswer({ summary })), { ok: false, reason: "summary is missing or empty" });
  }
});

test("identifiers that are not an object of text values are rejected", () => {
  for (const identifiers of [undefined, null, ["INV-1"], "INV-1", { invoice_number: 2291 }, { account: null }]) {
    assert.deepEqual(validateEnrichment(enrichmentAnswer({ identifiers })), {
      ok: false,
      reason: "identifiers is not an object of text values",
    });
  }
});

test("amounts that are not null or an object with numbers or null are rejected", () => {
  for (const amounts of [undefined, 1240, "1240", [1240, 980], { charged: "1240", expected: 980 }, { charged: 1240, expected: "980" }, { charged: 1240, expected: true }]) {
    assert.equal(validateEnrichment(enrichmentAnswer({ amounts })).ok, false, `accepted amounts ${JSON.stringify(amounts)}`);
  }
});

test("an urgency_signal other than high, medium or low is rejected", () => {
  for (const urgency_signal of ["High", "urgent", "", undefined, 3]) {
    assert.deepEqual(validateEnrichment(enrichmentAnswer({ urgency_signal })), {
      ok: false,
      reason: "urgency_signal is not high, medium or low",
    });
  }
});

test("an outage_signal that is not a boolean is rejected", () => {
  for (const outage_signal of ["true", "false", 1, 0, null, undefined]) {
    assert.deepEqual(validateEnrichment(enrichmentAnswer({ outage_signal })), {
      ok: false,
      reason: "outage_signal is not true or false",
    });
  }
});

test("the enrichment prompt names every Urgency Signal and every field the validator checks", () => {
  const prompt = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "prompts", "enrichment.md"), "utf8");
  const fields = ["core_issue", "identifiers", "amounts", "charged", "expected", "urgency_signal", "outage_signal", "summary"];
  for (const name of [...URGENCY_SIGNALS, ...fields]) assert.ok(prompt.includes(name), `prompt does not mention "${name}"`);
});

test("an amounts object with a missing amount treats it as null", () => {
  const check = validateEnrichment(enrichmentAnswer({ amounts: { charged: 100 } }));
  assert.equal(check.ok, true);
  assert.deepEqual(check.enrichment.amounts, { charged: 100, expected: null });
});

test("an amounts object with both amounts null becomes null, so records have one shape for no amounts", () => {
  const check = validateEnrichment(enrichmentAnswer({ amounts: { charged: null, expected: null } }));
  assert.equal(check.ok, true);
  assert.equal(check.enrichment.amounts, null);
});
