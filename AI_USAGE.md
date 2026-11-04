# How I used AI on this project

I built this with Claude Code as a pair programmer. This log records where I disagreed with the AI or where it got something wrong, and what I did about it.

## Outage detection: I rejected the AI's keyword rule

Claude's first design detected outages in two ways: the classification model chose an Incident/Outage Category, and a keyword rule acted as a backup that escalated any Request containing phrases like "outage", "down for" or "multiple users". I had accepted this during design, but when I read the code I pushed back. A keyword list doesn't understand meaning: it misses "nobody on our team can get in", and it would flag "we had an outage last year, all fine now". Claude argued that a backup can only add Escalations, never remove them, so its mistakes are cheap (a human looks at something unnecessary) while a missed outage is expensive. I then raised the opposite risk: the AI could classify correctly and the backup be the one that gets it wrong. If that happens often, people learn to ignore the Escalation queue and the backup protects nothing. We agreed on a better design. The keyword rule was removed and replaced by an Outage Signal, a second, independent AI judgement made during the enrichment step. A Request escalates if either AI call sees an outage, so both checks come from understanding the text, and disagreement between them is itself a useful sign that a human should look. I also added false-alarm test cases (messages that sound like outages but aren't) so the evaluation measures how often the backup is wrong instead of assuming it.

## Smaller fixes

- The test command Claude first wrote (`node --test test/`) failed on Node 26, which no longer accepts a folder name. It was changed to a file pattern.
- The code review found that the first version of the routing rules let malformed AI answers through (a missing confidence score, a null response, a category like "toString"). They were fixed so that anything malformed escalates to a human.
