# AI assistance credits

AI assistance is paid for with credits, separately from the HERCULES app plan
(`src/data/plans.ts`, unchanged: Company $5/mo, Owner-Operator $29/mo,
Fleet $19 per truck/mo, min 3).

## Where the numbers come from

Searched before finalising: the whole repository, its git history and every
data file. **No pre-existing numeric AI credit allowance exists in this
project.** The only earlier "credits" are truck-stop shower credits
(`src/data/stops.ts`) and supplier loyalty credits (`src/data/parts.ts`), which
are unrelated. So the table below is a *suggested fallback* awaiting the
owner's own guideline.

Authoritative, already-implemented and untouched:

| Item                     | Price                     | Source                |
| ------------------------ | ------------------------- | --------------------- |
| Company Driver plan      | $5 / month                | `src/data/plans.ts`   |
| Owner-Operator plan      | $29 / month               | `src/data/plans.ts`   |
| Fleet / Carrier plan     | $19 per truck / month     | `src/data/plans.ts`   |
| Voice Hand-Off Ordering  | $5.00 / month add-on      | `src/data/addons.ts`  |
| Document Upload          | $5.00 one time            | `src/data/addons.ts`  |

Every AI credit amount is editable in one file, `src/data/ai-credits.ts`, and
is entirely separate from the prices above.

## Owner-set catalogue (2026-09-13 — edit in `src/data/ai-credits.ts`)

Set by owner direction, final values ("lower thw credits"): the monthly
tiers and buy-once packs below supersede every earlier amount. Max is a $100
monthly subscription; there is no $100 buy-once pack and no $59 monthly plan.
Enterprise is quote-only.

### Monthly — replenishes once per paid period, expires at period end

| Tier   | Credits / month | Price      |
| ------ | --------------- | ---------- |
| Assist | 300             | $9 / mo    |
| Pro    | 1,000           | $29 / mo   |
| Max    | 3,500           | $100 / mo  |

### Buy once — never expires, carries over

| Pack   | Credits | Price         |
| ------ | ------- | ------------- |
| Small  | 200     | $10 one time  |
| Medium | 550     | $25 one time  |
| Large  | 1,200   | $50 one time  |

### Enterprise — contact for pricing

No price and no credit allowance are defined in code. There is no verified
sales email or phone number in this project, so the app never claims to send
one: the Enterprise card on `/credits` is a validated in-app form
(company, contact name, email, optional phone, fleet size, expected AI use,
optional notes) that writes a row to `public.enterprise_inquiries`.

- Requires an authenticated account; `user_id` is taken from the session.
- Spam controls: honeypot field, server-side Zod validation, and a limit of
  3 requests per account per 24 hours.
- RLS: a driver may create and read only their own rows. There is no update or
  delete grant for drivers, and review/triage happens with `service_role`
  (owner-only) — no client-side admin surface exists.
- Success and failure messages are truthful: on a database error the driver is
  told the request was NOT saved.

Monthly credits are always consumed before bought-once credits, so nothing
expires that could have been spent.

### Action costs (server-owned, shown before use)

| Action                          | Cost                                        |
| ------------------------------- | ------------------------------------------- |
| Spoken line (standard voice)    | 1 + 1 per 240 chars, max 6                  |
| Spoken line (premium persona)   | 2 + 1 per 200 chars, max 10                 |
| AI assistant answer (reserved)  | 2 + 1 per 400 chars, max 15                 |

Repeating a line the same account just heard is free (private per-account cache,
15 min). Eco quality uses the device's own voice at zero credits.

## Where credits can be added

Only `src/routes/api/public/stripe-webhook.ts`, after verifying the raw-body
`Stripe-Signature` HMAC and a 5-minute timestamp tolerance. Every event is first
claimed in `billing_events (provider, event_id)`; a duplicate, delayed or
out-of-order delivery loses that insert and returns without granting. Amounts
come from the server catalogue, never from the payload. The success URL grants
nothing; there is no client-side grant path and the grant/revoke routines are
executable only by `service_role`.

Handled events: `checkout.session.completed`, `invoice.paid` (renewal),
`invoice.payment_failed`, `customer.subscription.deleted`, `charge.refunded`,
`charge.dispute.created`.

## Spend protection on paid provider calls

`src/lib/speech.functions.ts` (previously unauthenticated) now requires a signed
in account, then in order: per-account rate limit → private cache lookup →
atomic credit reservation → provider call (20 s abort) → commit or full refund.
`src/lib/ai-meter.server.ts` holds the limiter, cache and in-flight dedupe.
Input is capped at `aiLimits.maxSpeechChars`.

## Accounting is server-owned, not user-owned

`ai_credits_reserve`, `ai_credits_commit`, `ai_credits_refund`,
`ai_credits_grant`, `ai_credits_revoke` and `ai_credits_touch` have `EXECUTE`
revoked from `PUBLIC`, `anon` and `authenticated` and granted only to
`service_role`, and all run `SET search_path = public, pg_temp`. An `auth.uid()`
check is not enough on its own: a client could otherwise list its own
reservations and commit a live hold at 0 credits (or refund it) while a paid
provider call was still in flight, making that call free. The routines therefore
take an explicit `_user` that server code resolves from a verified session, and
metering runs through the admin client inside `ai-meter.server.ts`. The wallet,
ledger, reservation and usage tables stay readable by their owner (RLS,
`auth.uid()`) with no client write path; `ai_set_quality_pref` remains
`authenticated` because it only sets a preference and derives the user itself.
`src/lib/credits.security.test.ts` asserts all of this against the live
database with the public browser key.

### Billing-period safety and idempotency

- Every reservation snapshots the wallet's `monthly_expires_at` in
  `period_expires_at`. A partial settlement or refund restores monthly credits
  only when the wallet is still in that same period; otherwise the unused
  monthly portion lapses and a ledger line records why. Bought-once credits
  always return.
- `ai_credits_grant` for the monthly bucket ignores an invoice whose period ends
  at or before the current `monthly_expires_at`, so a delayed or out-of-order
  older payment can never reset a newer period's balance. The ledger row is kept
  and marked superseded.
- `ai_credit_reservations.idem_key` is uniquely indexed and checked while the
  wallet row is locked, so a retried or duplicated hold with the same key
  returns the existing reservation instead of spending twice — across server
  instances, since the guarantee lives in the database.

## Margin reporting

`ai_usage_events` records `credits_charged`, `credits_saved`,
`provider_cost_usd` and `cost_basis`. The Lovable AI gateway does not return a
per-call price, so speech cost is `cost_basis = 'estimated'`, derived from
`providerCostAssumptions` — it is an assumption, not an invoice, and is labelled
that way in the app. No margin is guaranteed anywhere in the UI.

## Remaining setup before purchases can go live

Add these as project secrets; until all are present the credits screen shows an
honest "purchases not switched on" state and no checkout can be started:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_AI_ASSIST`, `STRIPE_PRICE_AI_PRO`, `STRIPE_PRICE_AI_MAX`
- `STRIPE_PRICE_AI_PACK_200`, `STRIPE_PRICE_AI_PACK_550`, `STRIPE_PRICE_AI_PACK_1200`

Webhook endpoint: `POST https://<site>/api/public/stripe-webhook`.

Automatic tax is deliberately NOT enabled — that requires verified tax
registration first.

## Known limits

- The rate limiter is per server instance, in memory: it bounds runaway loops
  but is not a distributed limit.
- Credit accounting was verified by unit tests and by reading the SQL routines;
  the end-to-end database exercise needs at least one real account, and this
  project currently has none.

## Accounting hardening (final pass)

- Holding, settling and refunding credits are service-role only. The browser
  cannot reserve, commit or refund even for its own account — verified by
  `src/lib/credits.security.test.ts` against the live database.
- One paid operation = one hold = one debit. De-duplication, the hold, the
  provider call and settlement all live inside `runMetered` in
  `src/lib/ai-meter.server.ts`, keyed by a durable request identity, so a retry
  on another instance reuses the same hold.
- Monthly credits are granted **only** from a verified paid invoice, once per
  subscription period, using Stripe's real period boundaries. Checkout
  completion grants one-time packs only.
- Webhook events are claimed as `pending`, and only marked `processed` after
  the fulfilment RPC succeeds; a failed attempt stays retryable.
- The payment customer for an account lives in `ai_billing_customers`
  (service-role only), never in a client-writable column, so the billing
  portal cannot be pointed at another customer.
- Checkout return addresses must match `src/data/app-origins.ts` or the
  optional `APP_BASE_URL` secret.
- Eco quality is enforced server-side: no paid speech call is made at all.
- Only implemented actions carry a credit cost: standard and premium spoken
  lines. There is no assistant-answer cost, because there is no assistant.

### Secrets still required before purchases can work

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and one price id per catalogue
entry (see `priceEnv` in `src/data/ai-credits.ts`). Optional: `APP_BASE_URL`.
