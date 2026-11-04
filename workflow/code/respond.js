// Build Response: the reply the webhook sends back. On an AI failure the
// classification fields are null and an ai_failure error explains why.
const { id, source, received_at, message, classification, model } = $input.first().json;
const failed = Boolean(classification.failed);

const reply = {
  id,
  source,
  received_at,
  message,
  category: failed ? null : classification.category,
  priority: failed ? null : classification.priority,
  confidence: failed ? null : classification.confidence,
  reasoning: failed ? null : classification.reasoning,
  model,
};
if (failed) reply.error = { type: "ai_failure", reason: classification.error };

return [{ json: reply }];
