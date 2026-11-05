# 04: Evaluation and prompt tuning

**What to build:** A command that runs a sample set through the live workflow, compares every Triage Record with an expectations file, and prints a pass/fail table. It is used to tune the prompts against the required and edge-case sets, and every AI mistake found is logged.

**Blocked by:** 03

**Status:** done

- [x] The five edge-case samples from the spec are in their own samples file
- [x] False-alarm samples (sound like an outage, aren't one, e.g. "we had an outage last year, all fine now", "one user can't see the dashboard") are included; the table reports false Escalations as a separate count
- [x] The expectations file lists, per sample, the acceptable Categories, the expected final Queue, the expected escalated value, and any required Escalation Reasons
- [x] The evaluation command prints one row per sample and a total for each set; a miss does not stop the run
- [x] It also checks that each Triage Record has every schema field
- [x] Prompts are adjusted until the required set passes, or each remaining miss is explained
- [x] Each AI mistake found (what happened, how it was noticed, the fix) is recorded in the AI usage log

## Comments

Findings from ticket 02:
- Sample #4's Confidence varied across runs at temperature 0: 0.78, 0.96, 0.75. Run each sample several times (e.g. 3) and report the spread, not a single value. This is evidence for the Phase 2 self-consistency idea.
- The `ai_failure` path has only been tested with stubs. Prove it end to end once, e.g. by pointing the workflow at a model name that doesn't exist, and check that the Request still gets a Triage Record.

Findings from ticket 03:
- On clean runs #4 gets Confidence 0.75–0.80 and is not escalated. An earlier "escalated" #4 was a Groq 429 (`ai_failure`), not low Confidence. Always check `ai_errors` before reading a result as a classification finding.
- The evaluation must respect the rate limit (8,000 tokens per minute). Running each sample 3 times takes several minutes, so build in spacing and report any 429s separately from misclassifications.
- The `ai_failure` path has now been seen end to end, from a real 429: the Request still got a full Triage Record and went to Escalation, with the reason in `ai_errors`.

Findings from ticket 04 (`npm run eval`, every sample 3 times):
- Baseline: required 12/15, edge 18/18, 0 AI errors, 0 false Escalations. The only miss was #4 (Technical Question at Confidence 0.75–0.80 in every run, so not escalated). The user chose to change the expectation rather than tune the prompt for one sample; the decision is recorded in the spec and the AI usage log. After the change: required 15/15. No prompt changes were needed.
- There are six edge-case samples, not five: the false-alarm case has two separate samples (past outage, single user).
- Both false alarms stayed unescalated in every run. The French outage was classified and escalated correctly. The vague one-liner got Confidence 0.60 and escalated.
- The mixed bug-and-billing sample changed Category between identical runs (Bug Report twice, Billing Issue once). Both are accepted. The evaluation does not check what the reasoning says; read it in `output/eval/edge.json` by hand.
- Failed webhook calls are counted as "call errors", apart from AI errors and misclassifications.
