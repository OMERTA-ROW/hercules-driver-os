import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, TriangleAlert, Zap, Gauge } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import { Panel, Label, DriverApprovedNote } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { aiEnterprise, aiLimits, aiPacks, aiPlans, freeForever } from "@/data/ai-credits";
import {
  getCreditState,
  setAiQuality,
  startAiCheckout,
  submitEnterpriseInquiry,
} from "@/lib/credits.functions";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/credits")({
  head: () => ({
    meta: [
      { title: "AI Credits — HERCULES" },
      {
        name: "description",
        content:
          "Your AI assistance balance in HERCULES: monthly credits, buy-once packs, what each spoken answer costs, and everything that stays free.",
      },
      { property: "og:title", content: "AI Credits — HERCULES" },
      {
        property: "og:description",
        content: "Monthly and buy-once AI credits, with the cost of every action shown before you use it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreditsPage,
});

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function CreditsPage() {
  const { account, ready } = useAuth();
  const fetchState = useServerFn(getCreditState);
  const checkout = useServerFn(startAiCheckout);
  const saveQuality = useServerFn(setAiQuality);
  const qc = useQueryClient();

  const state = useQuery({
    queryKey: ["ai-credits"],
    queryFn: () => fetchState(),
    enabled: ready && !!account,
  });

  const buy = useMutation({
    mutationFn: (v: { kind: "plan" | "pack"; id: string }) => checkout({ data: v }),
    onSuccess: (res) => {
      if (res.ok && res.url) {
        window.location.href = res.url;
        return;
      }
      toast.error("message" in res ? res.message : "Purchase unavailable.");
    },
    onError: () => toast.error("Purchase could not be started."),
  });

  const quality = useMutation({
    mutationFn: (q: "eco" | "balanced") => saveQuality({ data: { quality: q } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-credits"] }),
  });

  if (!ready) return null;

  if (!account) {
    return (
      <AppShell title="AI Credits" subtitle="AI assistance, billed separately from your plan">
        <Panel className="max-w-2xl">
          <Label>Sign in required</Label>
          <h2 className="mt-1 text-2xl font-bold uppercase">AI credits live on your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to see your balance, buy credits and choose how HERCULES speaks.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="lg" asChild>
              <Link to="/sign-in">Sign in</Link>
            </Button>
          </div>
        </Panel>
      </AppShell>
    );
  }

  const w = state.data?.wallet;
  const purchasing = state.data?.purchasing;

  return (
    <AppShell title="AI Credits" subtitle="Separate from your HERCULES plan — nothing bills without your word">
      <div className="grid gap-4">
        {/* BALANCE */}
        <Panel>
          <Label>Available balance</Label>
          <div className="mt-2 flex flex-wrap items-end gap-6">
            <div className="flex items-center gap-3">
              <Coins className="h-8 w-8 text-primary" />
              <span className="font-display text-5xl font-light">{w?.total ?? "—"}</span>
              <span className="tech-label mb-2">credits</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>
                <span className="text-foreground">{w?.monthly ?? 0}</span> monthly
                {w?.monthlyExpiresAt
                  ? ` — expires ${new Date(w.monthlyExpiresAt).toLocaleDateString()}`
                  : " — no active monthly plan"}
              </p>
              <p>
                <span className="text-foreground">{w?.purchased ?? 0}</span> bought once — never expires
              </p>
              {w?.renewsAt ? <p>Renews {new Date(w.renewsAt).toLocaleDateString()}</p> : null}
            </div>
          </div>
          {w?.low ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-primary">
              <TriangleAlert className="h-4 w-4" />
              Low balance — at or below {aiLimits.lowBalance} credits. Premium speech falls back to your
              device's own voice, free, until you top up.
            </p>
          ) : null}
          <p className="mt-3 text-sm text-muted-foreground">
            Monthly credits are used first, so nothing expires that could have been spent.
          </p>
        </Panel>

        {/* HONEST UNAVAILABLE STATE */}
        {purchasing && !purchasing.available ? (
          <Panel>
            <Label>Purchases not switched on</Label>
            <p className="mt-2 text-sm text-muted-foreground">
              Buying credits is not live yet — the payment setup for this app is incomplete, so nothing can be
              charged and no credits can be added. The tiers below are the catalogue that will go live.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Still needed: {purchasing.missing.join(", ")}
            </p>
          </Panel>
        ) : null}

        {/* MONTHLY */}
        <Panel>
          <Label>Monthly AI assistance</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Replenishes once each paid period. Unused monthly credits expire at the end of the period.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {aiPlans.map((p) => (
              <div key={p.id} className="rounded-lg border border-primary/25 p-4">
                <p className="font-display text-xl uppercase tracking-[0.12em]">{p.name}</p>
                <p className="mt-1 text-3xl font-light">{p.credits.toLocaleString()}</p>
                <p className="tech-label">credits / month</p>
                <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
                <p className="mt-2 text-lg">{money(p.price)} / month</p>
                <Button
                  size="lg"
                  className="mt-3 w-full"
                  disabled={!purchasing?.available || buy.isPending}
                  onClick={() => buy.mutate({ kind: "plan", id: p.id })}
                >
                  {w?.planId === p.id ? "Current plan" : `Subscribe — ${money(p.price)}/mo`}
                </Button>
              </div>
            ))}
          </div>
        </Panel>

        {/* PACKS */}
        <Panel>
          <Label>Buy once — carries over</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            One payment, no subscription. These credits never expire and are used after your monthly ones.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {aiPacks.map((p) => (
              <div key={p.id} className="rounded-lg border border-primary/25 p-4">
                <p className="font-display text-xl uppercase tracking-[0.12em]">{p.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
                <p className="mt-2 text-lg">{money(p.price)} one time</p>
                <Button
                  size="lg"
                  variant="outline"
                  className="mt-3 w-full"
                  disabled={!purchasing?.available || buy.isPending}
                  onClick={() => buy.mutate({ kind: "pack", id: p.id })}
                >
                  Buy {p.credits.toLocaleString()} credits
                </Button>
              </div>
            ))}
          </div>
        </Panel>

        {/* ENTERPRISE */}
        <EnterpriseQuote />


        {/* COSTS BEFORE USE */}
        <Panel>
          <Label>What things cost — before you use them</Label>
          <div className="mt-3 grid gap-2">
            {Object.entries(state.data?.costs ?? {}).map(([k, c]) => (
              <div key={k} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-primary/15 pb-2">
                <span className="text-sm">{c.label}</span>
                <span className="tech-label text-primary">
                  {c.base} credit start + 1 per {c.unit} characters · never more than {c.max}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            These are the same numbers the server charges — the screen cannot change them.
          </p>
        </Panel>

        {/* QUALITY */}
        <Panel>
          <Label>Speech quality</Label>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button
              size="lg"
              variant={w?.quality === "eco" ? "default" : "outline"}
              onClick={() => quality.mutate("eco")}
              disabled={quality.isPending}
            >
              <Gauge className="mr-2 h-5 w-5" /> Eco — device voice, 0 credits
            </Button>
            <Button
              size="lg"
              variant={w?.quality === "balanced" ? "default" : "outline"}
              onClick={() => quality.mutate("balanced")}
              disabled={quality.isPending}
            >
              <Zap className="mr-2 h-5 w-5" /> Balanced — persona voice, metered
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Eco uses your device's built-in voice and never spends a credit. Balanced uses your chosen persona
            and charges the amounts above. Repeating a line you just heard is free.
          </p>
        </Panel>

        {/* FREE */}
        <Panel>
          <Label>Always free</Label>
          <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
            {freeForever.map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
        </Panel>

        {/* USAGE HISTORY */}
        <Panel>
          <Label>Usage history</Label>
          {state.data?.usage.length ? (
            <div className="mt-2 grid gap-2 text-sm">
              {state.data.usage.map((u, i) => (
                <div key={i} className="flex flex-wrap justify-between gap-2 border-b border-primary/15 pb-2">
                  <span>{String(u["action"])}</span>
                  <span className="text-muted-foreground">
                    {Number(u["credits_charged"] ?? 0)} credits
                    {u["served_from_cache"] ? " · repeat, free" : ""}
                    {Number(u["credits_saved"] ?? 0) > 0 ? ` · saved ${Number(u["credits_saved"])}` : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {u["created_at"] ? new Date(String(u["created_at"])).toLocaleString() : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No AI usage on this account yet.</p>
          )}
        </Panel>

        {/* LEDGER */}
        <Panel>
          <Label>Credit history</Label>
          {state.data?.ledger.length ? (
            <div className="mt-2 grid gap-2 text-sm">
              {state.data.ledger.map((l, i) => (
                <div key={i} className="flex flex-wrap justify-between gap-2 border-b border-primary/15 pb-2">
                  <span>{String(l["reason"] ?? l["kind"])}</span>
                  <span className="text-muted-foreground">
                    {Number(l["monthly_delta"] ?? 0) !== 0 ? `${Number(l["monthly_delta"])} monthly ` : ""}
                    {Number(l["purchased_delta"] ?? 0) !== 0 ? `${Number(l["purchased_delta"])} bought` : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {l["created_at"] ? new Date(String(l["created_at"])).toLocaleString() : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No credits added or spent yet.</p>
          )}
        </Panel>

        <DriverApprovedNote>
          Credits are only ever added after a payment is confirmed by the payment provider itself. Nothing
          renews, tops up or escalates on its own.
        </DriverApprovedNote>
      </div>
    </AppShell>
  );
}

/**
 * Enterprise is quoted, not priced. This form saves a real request on the
 * account; there is no email address to send to, so we never claim we sent one.
 */
function EnterpriseQuote() {
  const send = useServerFn(submitEnterpriseInquiry);
  const [sent, setSent] = useState<string | null>(null);
  const [form, setForm] = useState({
    company: "",
    contactName: "",
    email: "",
    phone: "",
    fleetSize: "",
    expectedUsage: "",
    notes: "",
    website: "",
  });

  const submit = useMutation({
    mutationFn: () =>
      send({
        data: {
          company: form.company,
          contactName: form.contactName,
          email: form.email,
          phone: form.phone,
          fleetSize: Number(form.fleetSize || 0),
          expectedUsage: form.expectedUsage,
          notes: form.notes,
          website: form.website,
        },
      }),
    onSuccess: (res) => {
      if (res.ok) {
        setSent(res.message);
        toast.success("Request saved.");
      } else {
        toast.error(res.message);
      }
    },
    onError: () =>
      toast.error("Your request was not saved — nothing was sent. Please try again."),
  });

  const valid =
    form.company.trim().length >= 2 &&
    form.contactName.trim().length >= 2 &&
    /.+@.+\..+/.test(form.email.trim()) &&
    Number(form.fleetSize) >= 1 &&
    form.expectedUsage.trim().length >= 10;

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Panel>
      <Label>{aiEnterprise.name} — {aiEnterprise.priceLabel}</Label>
      <p className="mt-1 text-sm text-muted-foreground">{aiEnterprise.blurb}</p>

      {sent ? (
        <p className="mt-4 text-sm text-primary">{sent}</p>
      ) : (
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !submit.isPending) submit.mutate();
          }}
        >
          <div className="grid gap-1">
            <label htmlFor="ent-company" className="tech-label">Company</label>
            <Input id="ent-company" value={form.company} onChange={set("company")} required />
          </div>
          <div className="grid gap-1">
            <label htmlFor="ent-name" className="tech-label">Your name</label>
            <Input id="ent-name" value={form.contactName} onChange={set("contactName")} required />
          </div>
          <div className="grid gap-1">
            <label htmlFor="ent-email" className="tech-label">Email</label>
            <Input id="ent-email" type="email" value={form.email} onChange={set("email")} required />
          </div>
          <div className="grid gap-1">
            <label htmlFor="ent-phone" className="tech-label">Phone (optional)</label>
            <Input id="ent-phone" value={form.phone} onChange={set("phone")} />
          </div>
          <div className="grid gap-1">
            <label htmlFor="ent-fleet" className="tech-label">How many trucks</label>
            <Input
              id="ent-fleet"
              type="number"
              min={1}
              value={form.fleetSize}
              onChange={set("fleetSize")}
              required
            />
          </div>
          <div className="grid gap-1 md:col-span-2">
            <label htmlFor="ent-usage" className="tech-label">
              Expected AI use (drivers, hours a day, what for)
            </label>
            <Textarea id="ent-usage" rows={3} value={form.expectedUsage} onChange={set("expectedUsage")} required />
          </div>
          <div className="grid gap-1 md:col-span-2">
            <label htmlFor="ent-notes" className="tech-label">Anything else (optional)</label>
            <Textarea id="ent-notes" rows={2} value={form.notes} onChange={set("notes")} />
          </div>
          {/* Honeypot — hidden from drivers, filled only by bots. */}
          <input
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
            value={form.website}
            onChange={set("website")}
          />
          <div className="md:col-span-2">
            <Button size="lg" type="submit" disabled={!valid || submit.isPending}>
              {submit.isPending ? "Saving…" : "Request a quote"}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              This saves your request on your account for our review. No price is set, nothing is charged, and
              no plan changes.
            </p>
          </div>
        </form>
      )}
    </Panel>
  );
}
