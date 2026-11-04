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
