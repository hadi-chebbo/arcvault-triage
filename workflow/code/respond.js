// Build Response: the full Triage Record the webhook sends back, fields in the order of the spec.
// When an AI step failed, its fields are null and ai_errors says why.
const { id, source, received_at, message, classification, enrichment, decision, model } = $input.first().json;
const classified = !classification.failed;
const enriched = !enrichment.failed;

const aiErrors = [];
if (!classified) aiErrors.push("classification: " + classification.error);
if (!enriched) aiErrors.push("enrichment: " + enrichment.error);

// amounts gets the Overcharge from the decision module, or stays null.
const amounts = enriched && enrichment.amounts ? { ...enrichment.amounts, overcharge: decision.overcharge } : null;

return [
  {
    json: {
      id,
      source,
      received_at,
      message,
      category: classified ? classification.category : null,
      priority: classified ? classification.priority : null,
      confidence: classified ? classification.confidence : null,
      reasoning: classified ? classification.reasoning : null,
      core_issue: enriched ? enrichment.core_issue : null,
      identifiers: enriched ? enrichment.identifiers : null,
      amounts,
      urgency_signal: enriched ? enrichment.urgency_signal : null,
      outage_signal: enriched ? enrichment.outage_signal : null,
      standard_queue: decision.standard_queue,
      escalated: decision.escalated,
      escalation_reasons: decision.escalation_reasons,
      final_queue: decision.final_queue,
      summary: enriched ? enrichment.summary : null,
      model,
      ai_errors: aiErrors,
    },
  },
];
