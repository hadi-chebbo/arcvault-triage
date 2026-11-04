# 04: Evaluation and prompt tuning

**What to build:** A command that runs a sample set through the live workflow, compares every Triage Record with an expectations file, and prints a pass/fail table. It is used to tune the prompts against the required and edge-case sets, and every AI mistake found is logged.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] The five edge-case samples from the spec are in their own samples file
- [ ] False-alarm samples (sound like an outage, aren't one, e.g. "we had an outage last year, all fine now", "one user can't see the dashboard") are included; the table reports false Escalations as a separate count
- [ ] The expectations file lists, per sample, the acceptable Categories, the expected final Queue, the expected escalated value, and any required Escalation Reasons
- [ ] The evaluation command prints one row per sample and a total for each set; a miss does not stop the run
- [ ] It also checks that each Triage Record has every schema field
- [ ] Prompts are adjusted until the required set passes, or each remaining miss is explained
- [ ] Each AI mistake found (what happened, how it was noticed, the fix) is recorded in the AI usage log

## Comments

Findings from ticket 02:
- Sample #4's Confidence varied across runs at temperature 0: 0.78, 0.96, 0.75. Run each sample several times (e.g. 3) and report the spread, not a single value. This is evidence for the Phase 2 self-consistency idea.
- The `ai_failure` path has only been tested with stubs. Prove it end to end once, e.g. by pointing the workflow at a model name that doesn't exist, and check that the Request still gets a Triage Record.

Findings from ticket 03:
- On clean runs #4 gets Confidence 0.75–0.80 and is not escalated. An earlier "escalated" #4 was a Groq 429 (`ai_failure`), not low Confidence. Always check `ai_errors` before reading a result as a classification finding.
- The evaluation must respect the rate limit (8,000 tokens per minute). Running each sample 3 times takes several minutes, so build in spacing and report any 429s separately from misclassifications.
- The `ai_failure` path has now been seen end to end, from a real 429: the Request still got a full Triage Record and went to Escalation, with the reason in `ai_errors`.
