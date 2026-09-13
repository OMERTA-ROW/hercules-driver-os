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
- `STRIPE_PRICE_AI_TOPUP_50`, `STRIPE_PRICE_AI_TOPUP_100`, `STRIPE_PRICE_AI_TOPUP_250`, `STRIPE_PRICE_AI_TOPUP_500` (one-time, $0.30 per credit)

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

## Paid usage gating — what is actually metered today (final check)

- **Only one paid provider call exists:** speaking a line aloud in a neural
  persona (`src/lib/speech.functions.ts`, `openai/gpt-4o-mini-tts` through the
  Lovable AI Gateway). It requires a signed-in account, an authenticated server
  function, a rate limit, a per-account cache, in-flight de-duplication and a
  credit hold that is settled or refunded as one operation.
- **Voice previews are free.** `public/voice-samples/*.mp3` are static clips of
  the nine personas rendered once with `bun scripts/build-voice-samples.ts`.
  They are identical for every account, contain no user data, and are served as
  app assets — no gateway call, no credits. Re-run the script only when a
  persona's sample line, voice or direction changes.
- **Free fallback:** when premium speech is unavailable (not signed in, no
  credits, Eco quality, rate limited, provider failure) the device's own
  `speechSynthesis` voice reads the line and the UI states plainly that it is
  not the neural persona.
- **Stale-response cancellation:** playback carries a generation token. Stop, or
  any newer line, invalidates an in-flight request; a late provider reply is
  discarded and never played, and the device fallback stops any premium clip
  before it speaks. Covered by `src/lib/voice-cancel.test.tsx`.
- **Command handling is rule-based**, not a general AI assistant: intents are
  matched in `src/data/voice-commands.ts` / `src/lib/voice.tsx` at zero cost.
  There is no metered chat/assistant endpoint, and the UI must not claim one.
- **Purchases are not live:** no payment credentials are configured, so no
  monthly plan or credit pack can be bought or granted. Every credit balance is
  therefore zero until the setup in this document is completed.


## Subscriber top-ups, daily and weekly allowances (2026-09-13)

- One-time top-ups are priced at the owner's rate of **USD $0.30 per credit**
  (50/$15, 100/$30, 250/$75, 500/$150). They are **subscribers only**: the
  server refuses to open a top-up checkout without an active monthly AI plan,
  and `ai_credits_grant` records a top-up paid without a plan in the ledger as
  held, adding no spendable credits.
- Paid voice requires a monthly plan. `ai_exec_claim` returns
  `no_subscription` otherwise, and the app falls back to the device voice free.
- Each monthly plan has a daily and weekly credit allowance, enforced by
  `ai_exec_claim` via `ai_allowance_status`. Days reset 00:00 UTC, weeks reset
  **Saturday** 00:00 UTC. Going over never charges anything: paid voice pauses
  and the reset time is shown and spoken.
- Live limits are rows in `ai_plan_allowances` (service-role writable, readable
  by signed-in accounts). The same numbers are mirrored in
  `src/data/ai-credits.ts` for display. **PROPOSED, awaiting owner sign-off:**
  Assist 20/day 100/week · Pro 60/day 320/week · Max 200/day 1,100/week.
  Monthly included amounts are unchanged (300 / 1,000 / 3,500).


## Approved catalogue (owner, 2026-09-13) — supersedes everything above

Monthly (granted only on a verified paid invoice, once per paid period):

| Plan | Price | Credits / month | Per day | Per week |
| --- | --- | --- | --- | --- |
| Assist | $9 | 150 | 10 | 40 |
| Pro | $29 | 600 | 25 | 150 |
| Max | $100 | 3,000 | 110 | 750 |

One-time top-ups, $0.30 per credit, subscribers only, explicit purchase only:
10 / $3, 50 / $15, 100 / $30. The earlier 200/550/1200 and 250/500 packs are gone.

Proportions were adapted from a public consumer voice-plan ladder (ElevenLabs'
published Starter / Creator / Pro tiers) as a shape only. Their allowances are
provider characters, not HERCULES credits: no equivalence, parity or proven cost
basis is claimed anywhere in the app.

Enforcement facts:

- `ai_plan_allowances` holds the live caps; `src/data/ai-credits.ts` (`planCaps`)
  mirrors them for display. Keep them in step.
- Caps reset **usage counters only**. No reset, day or week, ever adds a credit
  to a wallet. Monthly balance is written only by `ai_credits_grant` from a
  verified paid invoice.
- Day ends at midnight `America/New_York`; week ends Saturday 00:00
  `America/New_York`. Both computed with `AT TIME ZONE`, so DST is correct.
- Caps are checked inside `ai_exec_claim`, which serialises on the wallet row and
  holds credits atomically, so concurrent requests cannot overspend a cap.
- Reaching a cap pauses paid speech **even with bought credits** and reports the
  next eligible time (Saturday when the week is out, local midnight otherwise).
  Running the monthly balance out is different: a top-up restores balance, but
  the day and week caps still apply.
- Subscribed = `ai_plan_id` set **and** `paid_through_at` still in the future.
  That covers cancel-at-period-end. There is no trial path and no profile column
  that can grant it; only the signed webhook writes it.
- Free at all times: the map and navigation, hazard warnings, the clock and
  hours, loads, money, health, every breakdown and safety action, the fixed
  spoken commands the app answers itself, and the device's own voice.
- Voice is a fixed set of spoken commands plus spoken read-backs. There is no
  open-ended text or voice chat assistant, and nothing in the UI claims one.
- No live billing: Stripe credentials are still unset, so every purchase path
  reports itself unavailable and no card can be charged.

## Superseded: monthly totals pending (2026-09-13, resolved above)

The owner has decided the included monthly amounts will be **reduced** and will
state the three figures. Until they arrive:

- `MONTHLY_CREDITS_PENDING = true` in `src/data/ai-credits.ts`. The credits
  screen says the counts are a placeholder and not an offer, and each plan card
  is marked "not final".
- The previous 300 / 1,000 / 3,500 are kept only as
  `monthlyCreditPlaceholders` and must NOT be treated as approved.
- Daily and weekly limits are never hand-written: `derivedAllowance` takes
  `ALLOWANCE_SHARE` (1/15 of the month per day, 1/3 per week) so a reduced total
  reduces both limits in proportion.

To apply the approved amounts:

1. Set the three numbers in `monthlyCreditPlaceholders` and flip
   `MONTHLY_CREDITS_PENDING` to `false`.
2. Sync the enforced limits (values from `allowanceRows()`):

```sql
INSERT INTO public.ai_plan_allowances (plan_id, daily_credits, weekly_credits) VALUES
  ('assist', <daily>, <weekly>), ('pro', <daily>, <weekly>), ('max', <daily>, <weekly>)
ON CONFLICT (plan_id) DO UPDATE
  SET daily_credits = EXCLUDED.daily_credits,
      weekly_credits = EXCLUDED.weekly_credits, updated_at = now();
```

Top-up unit price is settled: **$0.30 per credit, subscribers only**.
