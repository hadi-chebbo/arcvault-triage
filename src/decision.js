// Decision module: routing and escalation rules for one Request.
// Pure function, no I/O, no imports: this file is copied unchanged into an n8n Code node.
//
// Input:  { request: { message }, classification, enrichment }
//         classification / enrichment are the parsed AI answers, or { failed: true }
//         (or null) when that AI step still failed after its retries.
//         A successful enrichment must have outage_signal true or false.
// Returns the routing fields of the Triage Record:
//         { standard_queue, overcharge, escalated, escalation_reasons, final_queue }
// Anything malformed fails closed: it escalates with ai_failure rather than slipping through.

const STANDARD_QUEUES = {
  "Bug Report": "Engineering",
  "Incident/Outage": "Engineering (on-call)",
  "Feature Request": "Product",
  "Billing Issue": "Billing",
  "Technical Question": "Customer Success",
};

const CONFIDENCE_THRESHOLD = 0.7;
const OVERCHARGE_THRESHOLD = 500;

// Charged minus expected, rounded to cents. Null unless both amounts are numbers.
function overchargeOf(amounts) {
  if (!amounts || !Number.isFinite(amounts.charged) || !Number.isFinite(amounts.expected)) return null;
  return Math.round((amounts.charged - amounts.expected) * 100) / 100;
}

function decide({ request, classification, enrichment }) {
  const classified = Boolean(classification) && !classification.failed;
  const enriched = Boolean(enrichment) && !enrichment.failed;
  // A successful enrichment must say true or false; anything else fails closed.
  const outageSignalValid = enriched && typeof enrichment.outage_signal === "boolean";
  const category = classified ? classification.category : undefined;
  const confidence = classified ? classification.confidence : undefined;
  const confidenceValid = typeof confidence === "number" && confidence >= 0 && confidence <= 1;
  const standardQueue = Object.hasOwn(STANDARD_QUEUES, category) ? STANDARD_QUEUES[category] : null;
  const overcharge = enriched ? overchargeOf(enrichment.amounts) : null;

  // Checked in spec order; every reason that applies is kept.
  const reasons = [];
  if (confidenceValid && confidence < CONFIDENCE_THRESHOLD) reasons.push("low_confidence");
  if (category === "Incident/Outage") reasons.push("incident");
  if (outageSignalValid && enrichment.outage_signal === true) reasons.push("outage_signal");
  if (overcharge !== null && overcharge > OVERCHARGE_THRESHOLD) reasons.push("overcharge_over_500");
  if (standardQueue === null || !confidenceValid || !enriched || !outageSignalValid) reasons.push("ai_failure");

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
