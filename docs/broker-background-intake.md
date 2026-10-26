# Broker background intake — implemented foundation and connection contract

## Implemented
Company-scoped manual intake drafts, human email categorization, urgent flag, incomplete-lane visibility, explicit carrier/owned BOL review and immutable review history. Broker access requires both a server-granted Hercules broker role and active company membership. Browser writes to review/outbox tables are not granted; authenticated RPCs decide approval atomically.

Approval locks the draft, requires explicit confirmation, current verified carrier insurance, a trusted verified email that still matches contact_email, and an owned finalized BOL file with matching load reference. It stores an approved packet snapshot and creates one outbox intent per draft. Repeated identical approval returns that intent; changed carrier/document intent is refused. Nothing books freight or records carrier acceptance. Finalized file creation and recipient verification have no new UI/provider in this slice: they cannot be fabricated via selection.

Delivery intents are `needs_connection`, never sent. Inbox event uniqueness is company + provider + external event ID; retry/lease metadata and indexes are persisted. No polling browser, webhook, queue worker or sender is activated. This is not a live 24/7 service.

## Required provider activation contract
1. Connect an owner-approved email inbox and sending channel plus durable executor. Verify provider webhook signatures on the raw body, enforce body size/schema, resolve tenant from trusted provider account mapping, and persist the event with its external ID before acknowledging. Never trust a company ID in an email payload.
2. Worker atomically claims pending events using a lease and SKIP LOCKED, categorizes as a suggestion, preserves the original provider source and maps each event once to a draft. Retry transient failures with capped exponential backoff; dead-letter permanent failures. Durable wakeups/reconciliation must run without anyone logged in.
3. Only broker approval creates outbox work. Sender must recheck approval, current tenant membership, recipient verification and insurance, and owned document/file snapshot. A changed file/recipient requires renewed approval. Fetch private files server-side; never email public links to private storage.
4. Claim outbox with a lease, use the outbox UUID as provider idempotency key. After timeout reconcile with provider before resending. Persist provider message ID and send acknowledgement as `sent`, not delivered. Only a verified receipt/webhook marks delivered. Bounce/rejection is failed with redacted diagnostic detail. No guaranteed exactly-once delivery without provider idempotency.
5. Track attempts/next retry/error, cap retries and surface urgent exceptions; audit every transition. Preserve packet history instead of modifying an approved recipient/file. Never run secret reads at module scope or send through a browser.

## Current blockers
No accessible broker inbox, sender or durable execution connection was found. The Notion API returned object_not_found: owner must share the page with the Lovable integration. No paid service, fake incoming email, outbound send or production publication occurred.