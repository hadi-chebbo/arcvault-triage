# ArcVault Intake & Triage

An n8n pipeline that receives a customer Request at a webhook, classifies and enriches it with an LLM (Groq, `openai/gpt-oss-120b`), routes it to a Standard Queue with plain-code rules, escalates when a rule applies, and returns a full Triage Record. The Google Sheet comes in a later ticket.

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
