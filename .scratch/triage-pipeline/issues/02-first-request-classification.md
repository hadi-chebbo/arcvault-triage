# 02: First Request through n8n: classification

**What to build:** n8n starts in Docker with one command. A Request posted to the intake webhook is stamped with an ID, Source and received time, classified by Groq, and the webhook replies with the classification. The sender script sends sample #1 and prints the reply.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] One command starts n8n in Docker, with its data kept in a volume
- [ ] The Groq API key is read from an environment file that git ignores; an example file with a placeholder is committed
- [ ] The intake webhook accepts a JSON Request (Source, message) and rejects an empty message with a clear error
- [ ] Each Request gets an ID and a received-at timestamp
- [ ] The classification prompt is a file in the repo and is the source of truth for the text used in n8n
- [ ] Groq is called with `openai/gpt-oss-120b` in JSON mode at temperature 0
- [ ] The AI response validator is a pure module with unit tests (seam B): good answers pass; broken JSON, unknown Category or Priority, and Confidence that is missing, non-numeric or outside 0–1 are rejected
- [ ] The response is checked: valid JSON, Category and Priority from the allowed lists, Confidence a number from 0 to 1; an invalid response or API error is retried up to 2 times, then marked as an AI failure
- [ ] The webhook replies with Category, Priority, Confidence and reasoning
- [ ] The sender script posts sample #1 and prints the reply
- [ ] The five required samples live in a samples file
