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

Set by owner direction: monthly tiers reduced 20% from the provisional
allowances ("lower the credits a lil so we can keep users spending and making
money"); buy-once packs re-priced "$10 to $50" and then extended with a
$100 Max pack plus a quote-only Enterprise tier.

### Monthly — replenishes once per paid period, expires at period end

| Tier   | Credits / month | Price      |
| ------ | --------------- | ---------- |
| Assist | 400             | $9 / mo    |
| Pro    | 1,600           | $29 / mo   |
| Max    | 4,000           | $59 / mo   |

### Buy once — never expires, carries over

| Pack   | Credits | Price         |
| ------ | ------- | ------------- |
| Small  | 300     | $10 one time  |
| Medium | 800     | $25 one time  |
| Large  | 1,800   | $50 one time  |
| Max    | 4,000   | $100 one time |

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
- `STRIPE_PRICE_AI_PACK_300`, `STRIPE_PRICE_AI_PACK_800`, `STRIPE_PRICE_AI_PACK_1800`, `STRIPE_PRICE_AI_PACK_4000`

Webhook endpoint: `POST https://<site>/api/public/stripe-webhook`.

Automatic tax is deliberately NOT enabled — that requires verified tax
registration first.

## Known limits

- The rate limiter is per server instance, in memory: it bounds runaway loops
  but is not a distributed limit.
- Credit accounting was verified by unit tests and by reading the SQL routines;
  the end-to-end database exercise needs at least one real account, and this
  project currently has none.
