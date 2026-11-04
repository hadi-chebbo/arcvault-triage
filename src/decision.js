// Decision module: routing and escalation rules for one Request.
// Pure function, no I/O, no imports: this file is copied unchanged into an n8n Code node.
//
// Input:  { request: { message }, classification, enrichment }
//         classification / enrichment are the parsed AI answers, or { failed: true }
//         when that AI step still failed after its retries.
// Output: { standard_queue, overcharge, escalated, escalation_reasons, final_queue }

const STANDARD_QUEUES = {
  "Bug Report": "Engineering",
  "Incident/Outage": "Engineering (on-call)",
  "Feature Request": "Product",
  "Billing Issue": "Billing",
  "Technical Question": "Customer Success",
};

const CONFIDENCE_THRESHOLD = 0.7;
const OVERCHARGE_THRESHOLD = 500;

// Whole phrases only, so "download" never matches "down".
const OUTAGE_WORDING = /\b(outages?|down for|all users|multiple users|stopped loading)\b/i;

// Charged minus expected, rounded to cents. Null unless both amounts are numbers.
function overchargeOf(amounts) {
  if (!amounts || !Number.isFinite(amounts.charged) || !Number.isFinite(amounts.expected)) return null;
  return Math.round((amounts.charged - amounts.expected) * 100) / 100;
}

function decide({ request, classification, enrichment }) {
  const classified = !classification.failed;
  const enriched = !enrichment.failed;
  const standardQueue = (classified && STANDARD_QUEUES[classification.category]) || null;
  const overcharge = enriched ? overchargeOf(enrichment.amounts) : null;

  // Checked in spec order; every reason that applies is kept.
  const reasons = [];
  if (classified && classification.confidence < CONFIDENCE_THRESHOLD) reasons.push("low_confidence");
  if (classified && classification.category === "Incident/Outage") reasons.push("incident");
  if (OUTAGE_WORDING.test(request.message)) reasons.push("outage_keywords");
  if (overcharge !== null && overcharge > OVERCHARGE_THRESHOLD) reasons.push("billing_error_over_500");
  if (standardQueue === null || !enriched) reasons.push("ai_failure");

  const escalated = reasons.length > 0;
  return {
    standard_queue: standardQueue,
    overcharge,
    escalated,
    escalation_reasons: reasons,
    final_queue: escalated ? "Escalation" : standardQueue,
  };
}

if (typeof module !== "undefined") module.exports = { decide };
