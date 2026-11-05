// Sheet row module: turns a Triage Record into one row of plain cell values.
// Pure function, no I/O, no imports: this file is copied unchanged into an n8n Code node.
//
// Returns an object with the 20 schema fields in spec order. Every value is a string,
// number or boolean; nested fields become readable text and null becomes an empty cell.

const SHEET_FIELDS = [
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

// "key: value" pairs joined by "; ", skipping null values.
function pairsText(object) {
  return Object.entries(object)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}

function cell(field, value) {
  if (value === null || value === undefined) return "";
  if (field === "identifiers" || field === "amounts") {
    if (typeof value === "object" && !Array.isArray(value)) return pairsText(value);
  }
  if (field === "escalation_reasons" && Array.isArray(value)) return value.join(", ");
  if (field === "ai_errors" && Array.isArray(value)) return value.join("; ");
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function toSheetRow(record) {
  const row = {};
  for (const field of SHEET_FIELDS) row[field] = cell(field, record[field]);
  return row;
}

if (typeof module !== "undefined") module.exports = { toSheetRow };
