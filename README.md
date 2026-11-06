# ArcVault Intake & Triage

An n8n pipeline that receives a customer Request at a webhook, classifies and enriches it with an LLM (Groq, `openai/gpt-oss-120b`), routes it to a Standard Queue with plain-code rules, escalates when a rule applies, and returns a full Triage Record. Each Triage Record is also written to a Google Sheet.

## Deliverables

| Deliverable | Where |
|---|---|
| Workflow export (import into n8n) | [`workflow/arcvault-triage.json`](workflow/arcvault-triage.json) |
| Screenshots of each step's output | [`docs/screenshots/`](docs/screenshots/README.md) |
| Triage Records for the five required samples | [`output/records.json`](output/records.json) |
| Google Sheet (view-only) | [ArcVault Triage](https://docs.google.com/spreadsheets/d/1Malay51uF1p5RbS6VDyXEadtEgMP8sR8GJOKUXUh-tE/edit) |
| Prompt documentation | [`docs/prompts.md`](docs/prompts.md) |
| Architecture write-up | [`docs/architecture.md`](docs/architecture.md) |
| AI usage log | [`AI_USAGE.md`](AI_USAGE.md) |
| Evaluation results (11 samples, 3 runs each) | [`output/eval/`](output/eval/) |
| Loom walkthrough video | `<Loom URL>` (added at submission) |
| Live demo | Offered for the technical interview |
| Submission checklist (video and email) | [`docs/submission-checklist.md`](docs/submission-checklist.md) |

## Quick start

```
cp .env.example .env     # then put your Groq API key in .env
npm run n8n:up
npm run n8n:import
npm run send
```

The exported workflow names the Google Sheets credential it uses (`Google Sheets account`) but contains no secret. The Groq API key is read from `.env` and never stored in the workflow. To write to your own Sheet, see "Google Sheet" below.

## Prerequisites

Docker (with Compose) and Node 20 or later. No `npm install` is needed: there are no dependencies.

## Setup

Copy `.env.example` to `.env` and put your Groq API key in it (`.env` is ignored by git):

```
cp .env.example .env
```

## Start n8n

```
npm run n8n:up
```

n8n runs at http://localhost:5678 and keeps its data in a Docker volume.

## Import the workflow

```
npm run n8n:import
```

This imports `workflow/arcvault-triage.json`, publishes it and restarts n8n. Wait a few seconds before sending.

## Send the sample Requests

```
npm run send                        # all five required samples (about 2 minutes: Requests are
                                    # spaced 20s apart to stay under Groq's free-tier rate limit)
npm run send -- --only msg-001      # just one (writes no file)
npm run send -- --out my.json       # write the records to another path
```

A whole-file send prints one line per Request and writes the Triage Records as a JSON array to `output/records.json`.

## Google Sheet

Each Triage Record is written to two tabs: `All Records`, and the tab for its final Queue (`Engineering`, `Product`, `Billing`, `Customer Success` or `Escalation`). Nested fields are written as readable text, for example `error_code: 403; account: arcvault.io/user/jsmith`. Cells are written as raw text, so a message that starts with `=` is not run as a formula. If a write fails, the webhook still returns the Triage Record.

To point the imported workflow at your own Sheet:

1. Create a Sheet with the six tabs above. Row 1 of every tab must hold exactly these 20 names, one per column. Values are matched to columns by name, so a misspelled header loses that field:
   ```
   id,source,received_at,message,category,priority,confidence,reasoning,core_issue,identifiers,amounts,urgency_signal,outage_signal,standard_queue,escalated,escalation_reasons,final_queue,summary,model,ai_errors
   ```
2. In Google Cloud, turn on the Google Sheets API, set up the OAuth consent screen (External, add yourself as a test user), and create a Web application OAuth client with the redirect URI `http://localhost:5678/rest/oauth2-credential/callback`. In n8n, create a Google Sheets OAuth2 credential with that client ID and secret, and sign in with your Google account.
3. Open the nodes `Write All Records` and `Write Queue Tab`, select that credential, and change the document ID to your Sheet's ID.

The OAuth app is in Testing mode, so Google ends the sign-in after 7 days. Open the credential in n8n and click Reconnect.

## Test

```
npm test
```

## Evaluate

```
npm run eval                              # both sets, 3 runs each
npm run eval -- --set edge --runs 2       # one set (required or edge; default all), fewer runs
npm run eval -- --only msg-004            # one sample
```

This sends each sample through the workflow and checks every Triage Record against `samples/expectations.json`. It takes about 20 seconds per Request, so the default (11 samples, 3 runs) is about 11 minutes.

It prints one row per run, then totals and the Confidence spread for each set. The records are written to `output/eval/<set>.json`. A miss does not stop the run. AI errors (for example a Groq 429) and failed webhook calls are counted separately from misclassifications.

## Keeping the workflow in sync

`prompts/classification.md`, `prompts/enrichment.md`, `src/validate.js` and `src/decision.js` are the source of truth (`workflow/code/groq.js` is the Groq call shared by the Classify and Enrich nodes). After editing any of them, run `npm run sync` to copy them into the workflow JSON, then `npm run n8n:import`. `npm run sync:check` fails if the workflow is out of date.
