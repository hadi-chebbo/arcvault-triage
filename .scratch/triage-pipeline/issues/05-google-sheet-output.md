# 05: Google Sheet output

**What to build:** Every Triage Record is also written to a Google Sheet: to the All Records tab and to the tab for its final Queue. Reviewers can view the Sheet with a link.

**Blocked by:** 03

**Status:** ready-for-human (needs the user's Google Cloud setup: project, Sheets API, service account, sharing)

- [ ] The Sheet has tabs All Records, Engineering, Product, Billing, Customer Success and Escalation, each with the Triage Record columns in spec order
- [ ] Nested fields (identifiers, amounts, escalation reasons) are written as readable text
- [ ] Each record appears in All Records and in the tab for its final Queue
- [ ] n8n connects with a service account; no credential is committed to the repo
- [ ] After the five required samples are sent, the Sheet shows the expected tabs filled in
- [ ] The Sheet is shared view-only with anyone who has the link
