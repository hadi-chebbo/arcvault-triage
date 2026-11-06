# Spec: ArcVault intake and triage pipeline

Status: ready-for-agent

## Problem Statement

ArcVault receives unstructured Requests every day through three Sources: Email, Web Form, and Support Portal. A person reads each Request and decides which team should handle it. This is slow, and Requests often land in the wrong Queue: an outage filed as a bug waits behind routine work, and a billing dispute sits with Engineering. Receiving teams also have to reread the original Request to find the facts they need (invoice numbers, error codes, accounts), because nobody extracted them.

For the Valsoft assessment, the reviewers also need to see the pipeline run on the five sample Requests, inspect every Triage Record, and read why each design choice was made.

## Solution

An automated pipeline built in n8n. A Request arrives at a webhook and is processed without anyone touching it:

1. **Ingestion**: the webhook receives the Request and stamps it with an ID, its Source and the time it was received.
2. **Classification** (AI): the model assigns a Category, a Priority and a Confidence, plus one sentence of reasoning.
3. **Enrichment** (AI): the model extracts the Core Issue, the Identifiers, any money amounts and an Urgency Signal, and writes a Summary for the receiving team.
4. **Routing** (code): the Category maps to a Standard Queue.
5. **Escalation** (code): fixed rules decide whether the record goes to the Escalation Queue instead, and record every Escalation Reason that applied.
6. **Output**: the Triage Record is written to a shared Google Sheet (an "All Records" tab plus one tab per Queue) and returned in the webhook response. The sender script collects the responses into a JSON file.

The AI only reads and writes text. Every decision that must follow a rule exactly is plain code that can be tested.

## User Stories

### Intake

1. As a customer, I want my Request handled the same way whichever Source I use, so that my choice of channel does not change how fast I get help.
2. As an ArcVault operator, I want the pipeline to start automatically when a Request arrives, so that nobody has to watch an inbox and sort messages.
3. As an ArcVault operator, I want each Request to get a unique ID and the time it was received, so that I can trace it from arrival to Queue.
4. As an ArcVault operator, I want the original Request text kept in its Triage Record, so that a reviewer can check the AI's work against what the customer actually wrote.
5. As an ArcVault operator, I want a Request with an empty or missing message to be rejected with a clear error, so that blank Requests never create Triage Records.

### Classification

6. As a support lead, I want every Request assigned exactly one Category from a fixed list of five, so that routing never has to interpret free text.
7. As a support lead, I want an Incident/Outage separated from a Bug Report by how many users are affected, so that outages are never treated as single-user bugs.
8. As a support lead, I want a Request that asks how to use something to be a Technical Question, and one that asks for something new to be a Feature Request, so that Product only sees real requests.
9. As a support lead, I want every Request to get a Priority of High, Medium or Low under written rules, so that two similar Requests get the same Priority.
10. As a human reviewer, I want each classification to include a Confidence between 0 and 1, so that I know which decisions the AI was unsure about.
11. As a human reviewer, I want each classification to include one sentence of reasoning, so that I can see why the AI chose that Category without rereading the Request.
12. As an ArcVault operator, I want classification to give the same answer when the same Request is sent twice, so that the pipeline is predictable.

### Enrichment

13. As a receiving team member, I want the Core Issue stated in one sentence, so that I understand the Request at a glance.
14. As an engineer, I want account references, error codes and similar Identifiers extracted, so that I can start investigating without searching the text.
15. As a billing specialist, I want invoice numbers and both money amounts (charged and expected) extracted as numbers, so that I can check the dispute straight away.
16. As a billing specialist, I want the Overcharge calculated for me, so that I know how much money is in dispute.
17. As a support lead, I want an Urgency Signal that reflects the customer's own wording, so that I can compare how urgent they sound with the Priority we assigned.
18. As a receiving team member, I want a Summary of two or three sentences, so that I can act on the record without opening the original Request.
19. As a receiving team member, I want Identifiers that are not in the Request left out instead of invented, so that I never chase an invoice number that doesn't exist.

### Routing

20. As an engineer, I want every Bug Report to reach the Engineering Queue, so that bugs land with the people who fix them.
21. As an on-call engineer, I want every Incident/Outage to have Engineering (on-call) as its Standard Queue, so that outages are always marked for the on-call team.
22. As a product manager, I want every Feature Request in the Product Queue, so that I can review demand in one place.
23. As a billing specialist, I want every Billing Issue in the Billing Queue, so that disputes don't wait in Engineering.
24. As a customer success manager, I want every Technical Question in the Customer Success Queue, so that how-to questions get a fast answer.
25. As an ArcVault operator, I want the same Category to always route to the same Standard Queue, so that routing can be audited and tested.
26. As a human reviewer, I want an escalated record to still show its Standard Queue, so that I know which team to pass it to after review.

### Escalation

27. As a human reviewer, I want any record with Confidence below 0.70 escalated, so that uncertain classifications are checked before a team acts on them.
28. As an on-call engineer, I want every Incident/Outage escalated, so that a person confirms the outage straight away.
29. As an on-call engineer, I want a second, independent AI judgement of whether a Request describes an outage (the Outage Signal), and an Escalation when it says yes even if the Category is different, so that a misclassified outage is still caught.
30. As a human reviewer, I want the Outage Signal to come from understanding the Request rather than matching words, so that "we had an outage last year, all fine now" does not trigger a false Escalation.
31. As a billing manager, I want any Overcharge above $500 escalated, so that large disputes get a human before the customer is contacted.
32. As a billing manager, I want an Overcharge of exactly $500 not to escalate, so that the rule's boundary is clear and documented.
33. As a human reviewer, I want every Escalation Reason that applied recorded on the Triage Record, so that I know what to check first.
34. As a human reviewer, I want escalated records collected in their own Escalation Queue, so that I have one place to work from.

### Failure handling

35. As an ArcVault operator, I want an AI response that is not valid JSON retried up to two more times, so that a single bad response doesn't lose a Request.
36. As an ArcVault operator, I want an AI response with a Category, Priority or Confidence outside the allowed values treated as a failure and retried, so that invalid values never reach routing.
37. As an ArcVault operator, I want a Request whose AI calls still fail after retries escalated with the reason `ai_failure`, so that it reaches a human instead of disappearing.
38. As an ArcVault operator, I want a Groq timeout or error handled the same way as a bad response, so that an outage at the AI provider does not drop Requests.

### Output

39. As a receiving team member, I want every Triage Record to have the same fields in the same order, so that I can scan and filter them.
40. As a reviewer at Valsoft, I want a Google Sheet with an "All Records" tab and one tab per Queue, so that I can see routing at a glance without running anything.
41. As a reviewer at Valsoft, I want to open the Sheet with a view-only link, so that I don't have to request access.
42. As a reviewer at Valsoft, I want the Triage Records for the five sample Requests in a JSON file, so that I have the structured output deliverable even without the Sheet.
43. As a reviewer at Valsoft, I want each Triage Record to name the model that produced it, so that I can judge the results in context.
44. As an ArcVault operator, I want the webhook to respond with the finished Triage Record, so that the sender can confirm each Request was processed.

### Running and evaluating

45. As the developer, I want to start n8n with a single command, so that the setup can be repeated on another machine.
46. As the developer, I want one command that sends all sample Requests and saves their Triage Records, so that the demo is one step.
47. As the developer, I want the five required samples and five edge-case samples kept in separate files, so that the required results are reported on their own.
48. As the developer, I want a command that compares the pipeline's results with a file of expected answers and prints a pass/fail table, so that I can measure accuracy after every prompt change.
49. As the developer, I want unit tests for the routing and escalation rules that run without n8n or the AI, so that I can prove the boundaries hold.
50. As the developer, I want API keys and Google credentials kept out of git, so that no secret is ever committed.
51. As a reviewer at Valsoft, I want to import the exported workflow into my own n8n, so that I can inspect every node.

### Documentation

52. As a reviewer at Valsoft, I want every prompt documented with a paragraph on its structure, tradeoffs and what would change with more time, so that I can judge the prompt design.
53. As a reviewer at Valsoft, I want a one to two page architecture write-up covering system design, routing, escalation, production scale and Phase 2, so that I can judge the system design.
54. As a reviewer at Valsoft, I want the write-up to say which model was used and why, so that the model choice is justified.
55. As a reviewer at Valsoft, I want a log of what the AI got wrong during the build and how it was fixed, so that I can see how AI tools were used.
56. As a reviewer at Valsoft, I want a README that explains how to run the pipeline in a few commands, so that I can reproduce the results.

## Implementation Decisions

### Modules

- **Intake workflow** (n8n): webhook trigger → stamp Request → Classify → validate → Enrich → validate → Decide → write to Sheet → respond with the Triage Record. It is exported as JSON and kept in the repo.
- **Decision module**: one pure JavaScript function with no I/O. It takes the Request, the classification and the enrichment, and returns the routing and escalation outcome. It is the only place routing and escalation rules live.
- **AI response validator**: checks that each AI response parses as JSON and that every enum and number is within its allowed values. An invalid response counts as a failure.
- **Sender script**: reads a sample file, posts each Request to the webhook one at a time, and collects the responses into a JSON file of Triage Records.
- **Evaluation script**: runs the sender against a sample file, compares each Triage Record with an expectations file, and prints a pass/fail table.
- **Prompts**: two prompt files, one for classification and one for enrichment.

### Source of truth for code and prompts inside n8n

n8n Code and HTTP nodes hold their own copies of code and text. The decision module and the two prompt files are the source of truth, and a sync step copies them into the exported workflow. A check fails if the copies inside the workflow differ from the source files, so the tested code is always the code that runs.

### Decision module interface

Input:
- the Request (ID, Source, message text)
- the classification: Category, Priority, Confidence, reasoning; or a failure marker
- the enrichment: Core Issue, Identifiers, amounts (charged, expected; either may be missing), Urgency Signal, Summary; or a failure marker

Output: `standard_queue`, `overcharge` (null when either amount is missing), `escalated`, `escalation_reasons` (ordered list), `final_queue`.

Rules:
- Category → Standard Queue: Bug Report → Engineering; Incident/Outage → Engineering (on-call); Feature Request → Product; Billing Issue → Billing; Technical Question → Customer Success. An unknown Category escalates with `ai_failure`.
- Escalation Reasons, checked in this order:
  - `low_confidence`: Confidence < 0.70 (0.70 itself does not escalate)
  - `incident`: Category is Incident/Outage
  - `outage_signal`: the enrichment step judged that the Request describes a service outage affecting many users. This replaces an earlier keyword-matching rule; see Further Notes.
  - `overcharge_over_500`: Overcharge > 500 ($500 exactly does not escalate)
  - `ai_failure`: either AI step failed after retries
- `final_queue` is Escalation if any reason applies, otherwise the Standard Queue.
- Overcharge = charged − expected. The AI never does this arithmetic.

### AI calls

- Provider: Groq through its OpenAI-compatible chat completions API, with JSON response mode and temperature 0.
- Model: `openai/gpt-oss-120b` (open-weight, Apache 2.0). Llama 3.3 70B, the original choice, is no longer offered on Groq, and no general-purpose Llama model is left. gpt-oss-120b was tested against `qwen/qwen3.8-27b` on sample #5: both returned valid JSON, and gpt-oss-120b is the larger model.
- Call 1 (classification) receives the Request text. Its prompt defines each Category in one line, includes a tie-break rule between Technical Question and Feature Request, and spells out the Priority rules and the Confidence scale.
- Call 2 (enrichment) receives the Request text and the Category from call 1. It also returns the Outage Signal, judged from the text on its own, not copied from the Category. It must return only Identifiers that appear in the text, and amounts as plain numbers.
- Each call is tried up to 3 times in total (the first try plus 2 retries) on an invalid response or an API error.

### Triage Record schema

Fields, in this order: `id`, `source`, `received_at`, `message`, `category`, `priority`, `confidence`, `reasoning`, `core_issue`, `identifiers` (object of named Identifiers), `amounts` (`charged`, `expected`, `overcharge`, or null), `urgency_signal` (high, medium or low), `outage_signal` (true or false), `standard_queue`, `escalated`, `escalation_reasons`, `final_queue`, `summary`, `model`, `ai_errors` (list of short reasons why an AI step failed; empty when both succeeded). When a step fails, its fields are null.

### Google Sheet

- Tabs: All Records, Engineering, Product, Billing, Customer Success, Escalation. There is no on-call tab: every Incident/Outage escalates, so its records land in Escalation.
- Every tab has the same columns as the Triage Record schema. Nested fields (identifiers, amounts, escalation reasons) are written as readable text.
- Each record is written to All Records and to the tab for its `final_queue`.
- n8n connects with the developer's own Google account through OAuth (a Google Sheets OAuth2 credential). A service account was the plan, but the Cloud project's organization blocks service-account keys (`iam.disableServiceAccountKeyCreation`); OAuth needs no key file. Trade-off: in Testing mode the sign-in expires after 7 days and must be reconnected in n8n.
- Writes use the RAW cell format, so a message that starts with "=" is never run as a formula.
- A failed Sheet write does not lose the Request: the webhook still returns the Triage Record.
- The Sheet is shared view-only with anyone who has the link.

### Configuration and secrets

- n8n runs in Docker and is started with one command. Its data lives in a Docker volume.
- The Groq API key comes from an environment file that git ignores. The repo contains only an example file with placeholder values.
- The Google OAuth credential is stored only in n8n's credential store. The exported workflow names the credential but holds no secret.

## Testing Decisions

A good test exercises behavior through a public interface and asserts on outcomes (Queue, Escalation Reasons, fields present), not on how nodes are wired internally. Two seams were agreed with the user:

### Seam A: the webhook (main seam)

- The evaluation script posts every sample Request to the running workflow and checks each returned Triage Record against an expectations file.
- For each sample, the expectations give the acceptable Categories (more than one where a sample is ambiguous, as the mixed bug-and-billing edge case is), the expected `final_queue`, the expected `escalated` value, and any Escalation Reasons that must appear.
- It also checks that every Triage Record has every schema field.
- Because the AI is not fully deterministic, a miss is reported in the table and does not abort the run. Every miss is investigated and logged in the AI usage log.
- Expected results for the five required samples:

| # | Category | Final Queue | Escalated | Reasons |
|---|---|---|---|---|
| 1 | Bug Report | Engineering | no | none |
| 2 | Feature Request | Product | no | none |
| 3 | Billing Issue | Billing | no | none (Overcharge is $260) |
| 4 | Technical Question | Customer Success | no | none (changed in ticket 04, see below) |
| 5 | Incident/Outage | Escalation | yes | incident, outage_signal |

  Sample #4 is ambiguous on purpose. If the model is confident about it, record that as a finding: decide whether the prompt or the expectation should change, and don't hide the result.

  Decision (ticket 04): the expectation changed. The first expectation was Technical Question or Feature Request, escalated with low_confidence. In every evaluation run the model chose Technical Question at Confidence 0.75–0.80. Customer Success is a sensible Queue for it (they can answer, or log a Feature Request if Okta SSO doesn't exist), and pushing one sample below 0.70 through the prompt would be overfitting.

- Edge-case samples:
  - an Overcharge above $500 → Billing Issue, escalated with `overcharge_over_500`
  - false-alarm checks: Requests that sound like outages but are not ("we had an outage last year, all fine now"; "one user can't see the dashboard") → no `incident` and no `outage_signal`. The evaluation table reports false Escalations as their own count.
  - a mixed bug-and-billing message → one Category, with the choice explained in the reasoning
  - a vague one-liner → low Confidence, escalated
  - a non-English message → classified correctly

### Seam B: the pure rule modules (decision module and AI response validator)

The AI response validator was added to this seam during ticket 02, with the user's agreement: broken AI answers can't be produced on demand through the webhook, so this is the only way to prove they are rejected.

Decision module:

- Unit tests call the decision function directly with hand-written classification and enrichment inputs. No AI, no n8n.
- They cover:
  - every Category → Standard Queue mapping
  - Confidence exactly 0.70 vs 0.69
  - Overcharge exactly 500 vs 501
  - missing amounts (Overcharge is null, and the billing rule does not fire)
  - the Outage Signal escalates on its own, with any Category
  - a missing or non-boolean Outage Signal from a successful enrichment escalates with `ai_failure`
  - multiple reasons are all recorded, in order
  - an unknown Category and AI failure markers escalate with `ai_failure`
- They use Node's built-in test runner, so there are no dependencies to install.
- Prior art: none; this is a new repo.

## Out of Scope

- A real email inbox, Gmail or Mailhog intake. Sources are simulated by the sender script.
- Pushing to GitHub or any other remote. The project stays in local git until the user decides otherwise. (Changed in ticket 06: the repo was published to GitHub for the submission.)
- Real downstream systems (Jira, Slack, PagerDuty). Queues are Sheet tabs.
- Confidence based on self-consistency or log probabilities (Phase 2).
- A feedback loop where human corrections improve the prompts (Phase 2).
- Removing personal data from Requests, authentication on the webhook, rate limiting, and cost controls. Discussed in the write-up as production concerns, not built.
- Hosting n8n anywhere other than the developer's laptop.

## Further Notes

- Deliverables map to the brief:
  - 4.1: exported workflow, screenshots, Loom video, and an offer of a live demo
  - 4.2: the records JSON file and the Sheet link
  - 4.3: prompt documentation
  - 4.4: architecture write-up
  - Extra: an AI usage log for the interview question "what did the AI get wrong?"
- The brief's time budget is 3–5 hours, with a 2-day deadline. Prefer a clear, working pipeline over extra features.
- Setup steps only the user can do: create a Groq account and API key; create a Google Cloud project, turn on the Sheets API, set up the OAuth consent screen and client, create the Sheet, and connect a Google Sheets OAuth2 credential in n8n (reconnect it every 7 days while the OAuth app is in Testing mode).
- Outage detection changed after review: the first design used keyword matching as a backup to the Category. The user rejected it because keywords don't understand meaning and can be the part that gets it wrong. It is replaced by the Outage Signal, a second AI judgement made during enrichment. The design accepts some false Escalations to avoid missed outages, and measures them with the false-alarm samples.
- Write the documentation after the pipeline runs, so that it describes what really happened, including mistakes.
