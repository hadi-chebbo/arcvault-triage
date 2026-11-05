# 05: Google Sheet output

**What to build:** Every Triage Record is also written to a Google Sheet: to the All Records tab and to the tab for its final Queue. Reviewers can view the Sheet with a link.

**Blocked by:** 03

**Status:** done

- [x] The Sheet has tabs All Records, Engineering, Product, Billing, Customer Success and Escalation, each with the Triage Record columns in spec order
- [x] Nested fields (identifiers, amounts, escalation reasons) are written as readable text
- [x] Each record appears in All Records and in the tab for its final Queue
- [x] n8n connects with a Google OAuth credential (service-account keys are blocked by the org policy); no credential secret is committed to the repo
- [x] After the five required samples are sent, the Sheet shows the expected tabs filled in
- [x] The Sheet is shared view-only with anyone who has the link

## Comments

Findings from ticket 05:
- The service-account plan failed: the Cloud project's organization enforces `iam.disableServiceAccountKeyCreation`, so no key could be created. n8n now uses a Google Sheets OAuth2 credential with the developer's Google account. In Testing mode the sign-in expires after 7 days; reconnect it in n8n before a demo.
- Sheet: "ArcVault Triage", ID `1Malay51uF1p5RbS6VDyXEadtEgMP8sR8GJOKUXUh-tE`.
- Verified live: after the five required samples, every record is in All Records and in the tab for its final Queue; nested fields read as text (e.g. `charged: 1240; expected: 980; overcharge: 260`).
- Verified a failed write: with All Records pointed at a missing tab, the webhook still returned the full 20-field Triage Record and the Queue tab write still happened.
- The duplicate rows from three test sends were deleted; each tab now holds exactly the five required samples, matching `output/records.json`.
- Review fixes: the full-record test now uses a fixed record instead of live model output; both Sheets nodes always output an item, so the reply can't stall if a write returns nothing. Not changed: the reply still waits for both Sheet writes (simpler flow; Google writes take well under a second), and the header row must match the field names exactly (the README shows the exact line).
- The Sheet is shared view-only with anyone who has the link: https://docs.google.com/spreadsheets/d/1Malay51uF1p5RbS6VDyXEadtEgMP8sR8GJOKUXUh-tE/edit
