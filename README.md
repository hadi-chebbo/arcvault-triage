# ArcVault Intake & Triage

An n8n pipeline that receives a customer Request at a webhook and classifies it with an LLM (Groq, `openai/gpt-oss-120b`). Enrichment, routing, escalation and the Google Sheet come in later tickets.

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
npm run send                        # all five required samples
npm run send -- --only msg-001      # just one
```

## Test

```
npm test
```

## Keeping the workflow in sync

`prompts/classification.md` and `src/validate.js` are the source of truth. After editing either, run `npm run sync` to copy them into the workflow JSON, then `npm run n8n:import`. `npm run sync:check` fails if the workflow is out of date.
