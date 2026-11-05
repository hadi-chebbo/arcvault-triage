// Sheet Row: flattens the Triage Record into one row of plain cell values, using the tested module.
// The block marked COPY is written by scripts/sync-workflow.js. Do not edit it here.

// BEGIN COPY src/sheet-row.js
// END COPY src/sheet-row.js

return [{ json: toSheetRow($input.first().json) }];
