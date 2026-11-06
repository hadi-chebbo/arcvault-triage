# Submission checklist

For Hadi. Work through this in order.

## 1. Before recording

- [ ] Start Docker Desktop.
- [ ] `npm run n8n:up` and open http://localhost:5678.
- [ ] Reconnect the Google OAuth credential in n8n (Credentials, Google Sheets account, Reconnect). The sign-in expires after 7 days.
- [ ] Check that `.env` holds a working `GROQ_API_KEY`.
- [ ] `npm run n8n:import`, then wait a few seconds.
- [ ] Decide about the Sheet: a live send adds rows. Either clear the data rows of all six tabs first (keep row 1, the header), or accept that the tabs will hold two sets of records. Do not delete the header row.
- [ ] Run `npm test` and `npm run sync:check`. Both must pass.
- [ ] Check that `docs/screenshots/` holds all nine PNGs listed in its README.

## 2. Loom video outline (about 5 minutes)

1. **Problem (30 s).** ArcVault gets free-text Requests from Email, Web Form and Support Portal. People sort them by hand, so they land in the wrong Queue.
2. **Workflow tour in n8n (90 s).** Walk the canvas node by node: Intake Webhook, Stamp Request, Classify, Enrich, Decide, Build Response, the two Sheet writes, Respond 200. Say what is AI (Classify, Enrich) and what is plain code (Decide).
3. **Send the five samples live (60 s).** Run `npm run send`. Requests are spaced 20 s apart, so the whole file takes about 2 minutes: start it, then talk through the next steps or cut the wait.
4. **Output (45 s).** Show the Sheet: `All Records` and the Queue tabs. Open `output/records.json`.
5. **An escalation (45 s).** Show sample #5 in the `Escalation` tab: reasons `incident` and `outage_signal`, and its Standard Queue Engineering (on-call).
6. **Tests and evaluation (45 s).** Run `npm test`. Show `output/eval/` and the pass/fail table. Mention sample #4 and the mixed bug-and-billing Request.
7. **Design choices (45 s).** AI reads and writes text, code decides. Outage Signal instead of keywords. Overcharge instead of invoice total. Fail closed on bad AI output. Name the model and why.

## 3. Publish the repository

The repo has no remote yet. The plan is a public GitHub repo named `arcvault-triage`.

- [ ] Create the GitHub repo `arcvault-triage` (public).
- [ ] `git remote add origin <GitHub repo URL>`, then push `main` after merging this branch.
- [ ] Confirm `.env` is not committed: `git ls-files | grep -x .env` must print nothing, and `git log --all -- .env` must be empty.
- [ ] Open the repo in a private window and check that README, `docs/` and screenshots show.
- [ ] Open the Sheet link in a private window and check that it opens view-only.

## 4. Submission email

Send to your recruiting contact at Valsoft within 2 business days of receiving the assessment.

**Subject:** AI Engineer Assessment — Hadi Chebbo

**Body (draft):**

> Hello,
>
> Please find my submission for the AI Engineer assessment.
>
> - GitHub repository (workflow export, code, tests): <GitHub repo URL>
> - Loom walkthrough: <Loom URL>
> - Google Sheet with the Triage Records (view-only): https://docs.google.com/spreadsheets/d/1Malay51uF1p5RbS6VDyXEadtEgMP8sR8GJOKUXUh-tE/edit
> - Structured output file: `output/records.json` in the repository
> - Prompt documentation: `docs/prompts.md`
> - Architecture write-up: `docs/architecture.md`
> - AI usage log: `AI_USAGE.md`
> - Screenshots of each step: `docs/screenshots/`
>
> The README explains how to run it in a few commands. I am happy to give a live demo in the technical interview.
>
> Best regards,
> Hadi Chebbo
