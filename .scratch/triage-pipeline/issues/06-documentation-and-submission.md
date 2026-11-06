# 06: Documentation and submission package

**What to build:** Everything the reviewers receive: how to run it, prompt documentation, the architecture write-up, the AI usage log, the exported workflow, screenshots, and a checklist for the video and the email.

**Blocked by:** 04, 05

**Status:** done

- [x] The README explains setup and running in a few commands, and links every deliverable
- [x] The prompt documentation has both prompts in full, each with one paragraph on structure, tradeoffs and what would change with more time
- [x] The architecture write-up (1–2 pages) covers system design, routing logic, escalation logic, production scale (reliability, cost, latency), Phase 2, and which model was used and why
- [x] The AI usage log is complete and uses real examples from the build
- [x] The workflow is exported to the repo with no credential secrets in it (it names the n8n credential it uses), and the sync check passes
- [x] Screenshots show each step's output for the required samples
- [x] The records JSON file holds the final Triage Records for the five required samples
- [x] A checklist covers recording the Loom video and the submission email (subject "AI Engineer Assessment — [Name]", Sheet link, live demo offer)

## Comments

Done. Docs written by a Sonnet subagent, then reviewed with `/code-review` (standards and spec) and fixed.
- New: `docs/prompts.md`, `docs/architecture.md`, `docs/screenshots/` (9 images). Updated: `README.md` (deliverables table, quick start), `AI_USAGE.md` (model choice: Ollama `qwen2.5` → Llama 3.3 70B retired → `openai/gpt-oss-120b`).
- Brief 4.1 is met with the exported workflow plus screenshots, and a live-demo offer. A Loom video is optional.
- The n8n screenshots come from saved execution 219 (sample #5 in the final run), so no new Requests were sent and the Sheet keeps exactly the five records.
- The submission checklist and email draft are kept locally, out of the repo, with the agent setup files (`CLAUDE.md`, `docs/agents/`); recording a Loom (optional), making the repo public and sending the email are left to the developer.
