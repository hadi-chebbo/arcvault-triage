# 03: Full Triage Record for all 5 samples

**What to build:** The workflow adds enrichment and the decision rules, so the webhook returns a complete Triage Record. One command sends all five required samples and saves their Triage Records to the records JSON file.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] The enrichment prompt is a file in the repo; the call receives the Request and the Category, and returns Core Issue, Identifiers, amounts as numbers, Urgency Signal and Summary
- [ ] Enrichment responses are checked and retried like classification; a final failure is marked as an AI failure
- [ ] The decision module from 01 runs inside the workflow; a sync step copies it and both prompts into the exported workflow, and a check fails if any copy differs from its source file
- [ ] The webhook returns a Triage Record with every field, in the order the spec lists them
- [ ] An AI failure still produces a Triage Record, escalated with `ai_failure`
- [ ] One command sends all five required samples one by one and writes their Triage Records to the records JSON file
- [ ] For the five required samples, the results match the spec's expected table, or each difference is noted for ticket 04
