# ArcVault Intake & Triage

Automated sorting of unstructured customer requests sent to ArcVault (a fictional B2B software company), so each one reaches the team that should act on it.

## Requests

**Request**:
One unstructured message a customer sends to ArcVault, along with the channel it arrived through.
_Avoid_: Ticket, message, inquiry

**Source**:
The channel a Request arrived through: Email, Web Form, or Support Portal.
_Avoid_: Channel, origin

**Triage Record**:
The structured result of processing one Request: its classification, extracted facts, routing outcome, and summary.
_Avoid_: Output, result, ticket

## Classification

**Category**:
The single kind of Request: Bug Report, Feature Request, Billing Issue, Technical Question, or Incident/Outage.
_Avoid_: Type, label, intent

**Bug Report**:
Something that should work is broken for the customer who reported it.

**Incident/Outage**:
The service is down or degraded for many users at once.
_Avoid_: Bug (when many users are affected)

**Feature Request**:
A request for a capability ArcVault does not offer yet.

**Billing Issue**:
A question or dispute about invoices, charges, contracts, or refunds.

**Technical Question**:
A question about how to use or configure something ArcVault already offers.

**Priority**:
How soon a Request needs handling: High (outage, many users, or a whole organization blocked), Medium (one user blocked, or money in dispute), or Low (requests and how-to questions).
_Avoid_: Severity, urgency

**Confidence**:
How certain the classification is that the Category is correct, from 0 to 1. Below 0.70 means the Request could reasonably belong to two Categories.
_Avoid_: Certainty, score

## Enrichment

**Core Issue**:
The problem or ask in a Request, stated in one sentence.

**Identifier**:
A specific reference found in a Request, such as an account, invoice number, error code, or integration name.
_Avoid_: Entity, ID

**Urgency Signal**:
How urgent the customer's own wording makes the Request sound. Read from the text; Priority is the decision.
_Avoid_: Priority (they are different things)

**Overcharge**:
The amount charged minus the amount the contract says should have been charged.
_Avoid_: Billing error amount, invoice total

**Summary**:
Two or three sentences that let the receiving team act without reading the original Request.

## Routing

**Queue**:
The inbox of the team that handles a Triage Record: Engineering, Engineering (on-call), Product, Billing, Customer Success, or Escalation.
_Avoid_: Destination, bucket, team

**Standard Queue**:
The Queue a Request's Category maps to, before escalation is considered.

**Escalation**:
Sending a Triage Record to the Escalation Queue so a human reviews it first, instead of its Standard Queue. It happens when Confidence is below 0.70, the Category is Incident/Outage, the Request uses outage language, the Overcharge is above $500, or an AI step failed.
_Avoid_: Fallback, human review flag

**Escalation Reason**:
One of the rules that caused an Escalation. A Triage Record keeps every reason that applied.
