# 02: First Request through n8n: classification

**What to build:** n8n starts in Docker with one command. A Request posted to the intake webhook is stamped with an ID, Source and received time, classified by Groq, and the webhook replies with the classification. The sender script sends sample #1 and prints the reply.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] One command starts n8n in Docker, with its data kept in a volume
- [x] The Groq API key is read from an environment file that git ignores; an example file with a placeholder is committed
- [x] The intake webhook accepts a JSON Request (Source, message) and rejects an empty message with a clear error
- [x] Each Request gets an ID and a received-at timestamp
- [x] The classification prompt is a file in the repo and is the source of truth for the text used in n8n
- [x] Groq is called with `openai/gpt-oss-120b` in JSON mode at temperature 0
- [x] The AI response validator is a pure module with unit tests (seam B): good answers pass; broken JSON, unknown Category or Priority, and Confidence that is missing, non-numeric or outside 0–1 are rejected
- [x] The response is checked: valid JSON, Category and Priority from the allowed lists, Confidence a number from 0 to 1; an invalid response or API error is retried up to 2 times, then marked as an AI failure
- [x] The webhook replies with Category, Priority, Confidence and reasoning
- [x] The sender script posts sample #1 and prints the reply
- [x] The five required samples live in a samples file

## Comments

**Done.** Built by a Sonnet subagent and reviewed with `/code-review`. 48 unit tests pass, the sync check passes, and all 5 required samples were classified live.

Review findings, fixed:
- Re-importing reused n8n's previous versionId, so publish kept serving the old nodes. Changes never went live after the first import. Each import now gets a fresh versionId (verified live).
- The message was trimmed before storing; it is now kept exactly as sent.
- Source was not checked; it must now be Email, Web Form or Support Portal.
- A non-string message got a misleading error; each invalid case now has its own message.
- The 3 tries ran back to back; they now pause 1s and 3s, and the timeout is 20s.
- A test checks that the prompt names every Category and Priority the validator accepts.

Kept on purpose: an `id` sent by the source system is kept, so samples can be matched to their Triage Records. Detecting duplicate ids is Phase 2.
