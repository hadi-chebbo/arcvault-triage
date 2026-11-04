# 01: Decision rules with unit tests

**What to build:** The routing and escalation rules as one pure function (the decision module), with unit tests that prove every rule and boundary from the spec. Given a Request, a classification and an enrichment (or AI failure markers), it returns the Standard Queue, the Overcharge, whether the record is escalated, every Escalation Reason that applied, and the final Queue. It runs with no n8n, no AI, and no installed dependencies.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Each of the five Categories maps to its Standard Queue as in the spec; an unknown Category escalates with `ai_failure`
- [ ] Confidence 0.69 escalates with `low_confidence`; 0.70 does not
- [ ] Incident/Outage escalates with `incident`
- [ ] Each outage phrase ("outage", "down for", "all users", "multiple users", "stopped loading") escalates with `outage_keywords`, case-insensitive; "download" does not
- [ ] Overcharge = charged − expected; 501 escalates with `billing_error_over_500`, 500 does not; a missing amount gives a null Overcharge and the billing rule does not fire
- [ ] A failed classification or enrichment escalates with `ai_failure`
- [ ] When several rules apply, all reasons are recorded in spec order
- [ ] Final Queue is Escalation when any reason applies, otherwise the Standard Queue
- [ ] The function has no I/O and depends on nothing outside itself, so its source can be pasted into an n8n Code node unchanged
- [ ] Tests run with Node's built-in test runner from one npm script, and pass
