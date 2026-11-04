# 03: Full Triage Record for all 5 samples

**What to build:** The workflow adds enrichment and the decision rules, so the webhook returns a complete Triage Record. One command sends all five required samples and saves their Triage Records to the records JSON file.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] The enrichment prompt is a file in the repo; the call receives the Request and the Category, and returns Core Issue, Identifiers, amounts as numbers, Urgency Signal, Outage Signal (true/false, judged from the text, not from the Category) and Summary
- [ ] Enrichment responses are checked and retried like classification; a final failure is marked as an AI failure
- [ ] The decision module from 01 runs inside the workflow; a sync step copies it and both prompts into the exported workflow, and a check fails if any copy differs from its source file
- [ ] The Code node wraps the decision module with a few lines that call `decide` and return n8n items; the sync check compares only the module part
- [ ] AI failures reach the decision module as `{ failed: true }`, and the validator rejects amounts that are not numbers (the module treats them as missing)
- [ ] The decision module replaces the keyword rule with `outage_signal`: it escalates when the enrichment's Outage Signal is true, and a successful enrichment without a boolean Outage Signal escalates with `ai_failure`. The keyword tests are replaced by Outage Signal tests, written test-first
- [ ] Spec, glossary and decision module agree: no `outage_keywords` remains anywhere
- [ ] The webhook returns a Triage Record with every field, in the order the spec lists them
- [ ] An AI failure still produces a Triage Record, escalated with `ai_failure`
- [ ] One command sends all five required samples one by one and writes their Triage Records to the records JSON file
- [ ] For the five required samples, the results match the spec's expected table, or each difference is noted for ticket 04
