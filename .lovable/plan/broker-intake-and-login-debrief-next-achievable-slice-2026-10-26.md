# Broker intake and login debrief — next achievable slice

## Build now
- Upgrade the existing Broker Desk with a ready-to-review debrief: incoming load drafts, urgent exceptions, carrier-pending BOL packets, and approval queue. Preserve existing features and label the legacy sample broker workspace **Demo**.
- Store manually entered intake drafts and email categories persistently, company-scoped. Include per-load review status, source, missing-information flags, selected carrier, approval history and document-delivery status. No fabricated incoming email.
- Route authenticated brokers to the Broker Desk after ordinary login, based on server-granted roles rather than the selected login door; preserve explicit safe return destinations.
- Let authorized brokers select a carrier and review the exact load/document/recipient before approval. Enforce company access, carrier verification and document ownership on the server. Approval records intent; it does not claim that freight is booked or the carrier has accepted.
- Create a durable delivery outbox only after explicit approval. Until a real channel and verified recipient are configured, show **Needs Connection / Not sent**, never delivered or Live. Preserve owner-scoped BOL drafts; do not share an unfinished BOL automatically.

## Background architecture
Persist inbox event IDs, ingestion state, retry count, next-attempt time and errors. Specify signed provider webhooks → durable inbox → categorized draft → broker approval → immutable approved packet/recipient → durable delivery outbox → provider receipt/status. Use database uniqueness for idempotency and atomic claims for retries. Do not rely on a browser timer or a logged-in user for ingestion.

No supported broker email, sending channel or background execution service is currently connected. This slice therefore builds persistent review/outbox groundwork and an explicit connection-blocked status, not a fake 24/7 service or an unconfigured public webhook. Provider-specific ingestion, background execution, automatic document sending and delivery receipts remain blocked until the owner connects a suitable channel and approves any usage costs.

## Verification
- Add concrete tests for approval-before-outbox, company isolation, verified recipients, idempotency, truthful disconnected delivery, category/status rules and broker login destination.
- Run focused tests and inspect automatic build/typecheck results; verify desktop/mobile debrief and existing chat/orb behavior without paid calls or sends.
- Attempt authenticated verification using available session tooling; if no suitable account exists, report that limit rather than testing only Demo and claiming success.
- Report exact saved commit, preview link, completed pieces and blockers. Do not publish this slice.

## Known limits
The linked Notion page is not shared with CryptoGoochi's Notion connection: the API returned `object_not_found`. This plan follows the written owner directive; share the blueprint page with the Lovable integration to make its private contents readable. No integration is linked or purchased by this plan.

## Technical boundaries
Use additive Cloud migrations, explicit grants/RLS and authenticated TanStack server functions. Keep tenant identity and role checks authoritative in the database. Use the current companies/memberships/carrier/document models where their verified boundaries fit; do not revive the cancelled broad Freight OS rebuild. Never let client-selected status, email or roles establish recipient verification or successful delivery.