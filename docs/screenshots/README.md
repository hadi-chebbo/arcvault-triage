# Screenshots

The step images come from one saved n8n execution: sample #5 (the dashboard outage) from the final run of the five required samples, the same run that produced `output/records.json`. Each one shows the node's input on the left and its output on the right. Sample #5 is shown because it passes through every rule: it is classified, enriched, and escalated.

## Workflow

![The whole workflow canvas: Intake Webhook, Stamp Request, Classify, Enrich, Decide, Build Response, the Sheet writes and Respond 200](01-workflow.png)

The whole workflow canvas in n8n.

## Node output

![Output of the Stamp Request node](02-stamp.png)

`Stamp Request`: the Request with its id, Source and time received.

![Output of the Classify node](03-classify.png)

`Classify`: Category, Priority, Confidence and reasoning from the first Groq call.

![Output of the Enrich node](04-enrich.png)

`Enrich`: Core Issue, Identifiers, amounts, Urgency Signal, Outage Signal and Summary from the second Groq call.

![Output of the Decide node](05-decide.png)

`Decide`: Standard Queue, Overcharge, Escalation Reasons and final Queue, set by plain code.

![Output of the Write All Records node](06-sheet-writes.png)

`Write All Records`: the flattened row appended to the `All Records` tab. `Write Queue Tab` then appends the same row to the tab for the final Queue (here `Escalation`).

![Output of the Respond 200 node](07-respond.png)

`Respond 200`: the full Triage Record returned to the sender, with the 20 schema fields.

## Google Sheet

![The All Records tab with the five Triage Records](08-sheet-all-records.png)

The `All Records` tab holding the five required samples.

![The Escalation tab with sample 5](09-sheet-escalation.png)

The `Escalation` tab: sample 5, escalated with `incident` and `outage_signal`.
