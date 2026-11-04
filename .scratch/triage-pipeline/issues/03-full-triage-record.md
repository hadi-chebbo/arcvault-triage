# 03: Full Triage Record for all 5 samples

**What to build:** The workflow adds enrichment and the decision rules, so the webhook returns a complete Triage Record. One command sends all five required samples and saves their Triage Records to the records JSON file.

**Blocked by:** 01, 02

**Status:** done

- [x] The enrichment prompt is a file in the repo; the call receives the Request and the Category, and returns Core Issue, Identifiers, amounts as numbers, Urgency Signal, Outage Signal (true/false, judged from the text, not from the Category) and Summary
- [x] Enrichment responses are checked and retried like classification; a final failure is marked as an AI failure
- [x] The decision module from 01 runs inside the workflow; a sync step copies it and both prompts into the exported workflow, and a check fails if any copy differs from its source file
- [x] The Code node wraps the decision module with a few lines that call `decide` and return n8n items; the sync check compares only the module part
- [x] AI failures reach the decision module as `{ failed: true }`, and the validator rejects amounts that are not numbers (the module treats them as missing)
- [x] The decision module replaces the keyword rule with `outage_signal`: it escalates when the enrichment's Outage Signal is true, and a successful enrichment without a boolean Outage Signal escalates with `ai_failure`. The keyword tests are replaced by Outage Signal tests, written test-first
- [x] Spec, glossary and decision module agree: no `outage_keywords` remains anywhere
- [x] The webhook returns a Triage Record with every field, in the order the spec lists them
- [x] An AI failure still produces a Triage Record, escalated with `ai_failure`
- [x] One command sends all five required samples one by one and writes their Triage Records to the records JSON file
- [x] For the five required samples, the results match the spec's expected table, or each difference is noted for ticket 04

## Comments

**Done.** Built by a Sonnet subagent, then reviewed and fixed with `/code-review`. 64 unit tests pass, the sync check passes, and all 5 required samples produce complete Triage Records with no AI errors (`output/records.json`).

Fixed after the subagent's report and the review:
- Identifiers were missing (403 on #1, Okta on #4). The enrichment prompt now lists each kind of Identifier with an example.
- n8n briefly served the previous version after an import. The import now stamps the versionId into the 400 reply and waits until n8n serves it, and fails loudly if the stamp line is missing.
- The committed records had #4 as `ai_failure` from a Groq 429 (rate limit: 8,000 tokens per minute on the free tier). Retries now wait 10s and 20s, and the sender spaces Requests 20s apart.
- Tried low reasoning effort for enrichment to save tokens. It dropped Identifiers on #2 and #5, so it was reverted to the default.
- A missing amount now counts as null, and an amounts object with both amounts null becomes null, so "no amounts" has one shape.

Differences from the spec's expected table, for ticket 04: #4 is Technical Question with Confidence 0.75–0.80 on clean runs, so it is not escalated (the spec expected `low_confidence`).

Kept on purpose: `decide` still takes the Request (the spec's interface lists it), and the sync check compares whole nodes, which is stricter than the ticket asked.
