# Screenshots

Each image shows one step of the pipeline for the five required samples. The step images are the output of each node in an n8n execution.

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

![Output of the Sheet write nodes](06-sheet-writes.png)

The two Google Sheets writes: `All Records` and the tab for the final Queue.

![Output of the Respond 200 node](07-respond.png)

`Respond 200`: the full Triage Record returned to the sender.

## Google Sheet

![The All Records tab with the five Triage Records](08-sheet-all-records.png)

The `All Records` tab holding the five required samples.

![The Escalation tab with sample 5](09-sheet-escalation.png)

The `Escalation` tab: sample 5, escalated with `incident` and `outage_signal`.
