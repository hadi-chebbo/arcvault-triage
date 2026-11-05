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

// How each nested field is written. Reasons read as a list; the others as "; "-separated parts.
const FORMATTERS = {
  identifiers: (value) => (isPlainObject(value) ? pairsText(value) : undefined),
  amounts: (value) => (isPlainObject(value) ? pairsText(value) : undefined),
  escalation_reasons: (value) => (Array.isArray(value) ? value.join(", ") : undefined),
  ai_errors: (value) => (Array.isArray(value) ? value.join("; ") : undefined),
};

function isPlainObject(value) {
  return typeof value === "object" && !Array.isArray(value);
}

function cell(field, value) {
  if (value === null || value === undefined) return "";
  const formatted = FORMATTERS[field] ? FORMATTERS[field](value) : undefined;
  if (formatted !== undefined) return formatted;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function toSheetRow(record) {
  const row = {};
  for (const field of SHEET_FIELDS) row[field] = cell(field, record[field]);
  return row;
}

if (typeof module !== "undefined") module.exports = { toSheetRow };
