const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateClassification } = require("../src/validate.js");

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
